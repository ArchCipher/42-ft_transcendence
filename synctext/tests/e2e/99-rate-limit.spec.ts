import { test, expect } from './fixtures/auth';
import { makeUser } from './utils/test-helpers';
import { seedUser } from './utils/seed-users';

/*
This file covers what tests/auth/01-rate-limiter.test.ts deliberately does not:
that the auth routes actually consult the limiters and answer 429. The limiter's
own semantics - sliding window, lockout, the maxFailures off-by-one, 100 racing
callers - are unit tested there.

Both limiters live in web process memory and are keyed per client IP, which in
compose means every request in the suite shares one bucket. That has two
consequences:

  * this file is numbered 99- so it sorts after 01-09: it deliberately burns the
    sign-up quota for the whole hour and locks logins out for 15 minutes, so
    nothing that needs to register or log in may run after it
  * running it needs a clean limiter, which db-state.sh gives us by restarting
    web before the suite (a DB truncate cannot clear process memory)

Limits under test, from packages/shared + lib/auth/rate-limit.ts:
  REGISTER_LIMIT  5 successes / hour  -> 429 "Too many accounts from this network"
  IP_LIMIT       10 failures / 15min -> 429 "Too many attempts"

Accounts created here are unverified throwaways and the DB reset at the end of
the run removes them; seeded users are only ever read.
*/

type ApiResponse = { status: number; body: unknown };

async function post(request: import('@playwright/test').APIRequestContext, path: string, data: unknown) {
  const res = await request.post(path, { data });
  return { status: res.status(), body: await res.json() } satisfies ApiResponse;
}

/*
Registers until the quota refuses, and reports how many got through. The cap is 6
because the quota can be partly spent already: 01, 07, 11, 12 and 14's sweep spend
all 5 slots, then 17's beforeAll restarts web (clearing them) and 17 spends 2 of
the fresh 5 - so this loop legitimately creates up to 3 accounts. 6 attempts always
suffice: worst case starts with nothing spent (5 creations + the 429 probe = 6).
*/
async function registerUntilBlocked(
  request: import('@playwright/test').APIRequestContext,
) {
  let created = 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await post(request, '/api/auth/register', makeUser('quota'));
    if (res.status === 429) return { created, blocked: res as ApiResponse };
    expect(res.status, `registration ${attempt + 1}: ${JSON.stringify(res.body)}`).toBe(201);
    created++;
  }
  return { created, blocked: null };
}

async function login(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string,
) {
  return post(request, '/api/auth/login', { email, password });
}

test.describe('Rate limiting (route wiring)', () => {
  test.skip(({browserName})=>browserName !== "chromium", "IP-field limiters are shared by all browser projects; run this wiring spec once");
  test('a rejected registration never costs quota', async ({ request }) => {
    // registerLimiter.recordFailure runs only on the 201 path, so these 400s
    // must not push the bucket towards its 5/hour ceiling
    for (let i = 0; i < 6; i++) {
      const res = await post(request, '/api/auth/register', { email: 'not-an-email' });
      expect(res.status).toBe(400);
    }

    // the limiter gate is not blocking: a payload that fails schema validation
    // is answered by the validator, never by the quota
    expect((await post(request, '/api/auth/register', {})).status).toBe(400);
  });

  test('the sign-up quota stops the sixth account in an hour', async ({ request }) => {
    const { created, blocked } = await registerUntilBlocked(request);

    expect(blocked, 'expected the hourly quota to block registration').not.toBeNull();
    expect(created).toBeLessThanOrEqual(5);
    expect(blocked!.status).toBe(429);
    expect(blocked!.body).toEqual({ error: 'Too many accounts from this network' });
  });

  test('the quota is checked before the database', async ({ request }) => {
    const alice = seedUser('alice');

    // an account that certainly already exists: the quota answers first, so the
    // caller never learns that this email is taken
    const duplicate = await post(request, '/api/auth/register', {
      email: alice.email,
      username: 'quota_probe',
      password: 'TestPass123!',
    });
    expect(duplicate.status).toBe(429);
    expect(duplicate.body).toEqual({ error: 'Too many accounts from this network' });
  });

  test('a successful login clears the IP failure counter', async ({ request }) => {
    const zaphod = seedUser('zaphod');

    for (let i = 0; i < 5; i++) {
      expect((await login(request, zaphod.email, 'WrongPass123!')).status).toBe(401);
    }

    // success clears both the IP and the account bucket (rate-limit.ts:137)
    expect((await login(request, zaphod.email, zaphod.password)).status).toBe(200);

    // so five more failures are still fine: the counter restarted from zero and
    // this test never reaches the 10-failure lockout
    for (let i = 0; i < 5; i++) {
      expect((await login(request, zaphod.email, 'WrongPass123!')).status).toBe(401);
    }
  });

  test('repeated failed logins lock the whole IP out', async ({ request }) => {
    const zaphod = seedUser('zaphod');
    const tim = seedUser('tim');

    // Drive the limiter instead of counting: 01 and 08 have already spent part of
    // this IP's 10-failure budget, so the starting point is not zero. Bound the
    // loop by the worst case (a completely fresh bucket still arms within 10).
    let refused = 0;
    let armed = false;
    for (let i = 0; i < 25 && !armed; i++) {
      const attempt = await login(request, zaphod.email, 'WrongPass123!');
      if (attempt.status === 429) armed = true;
      else if (attempt.status === 401) refused++;
      else throw new Error(`unexpected login status ${attempt.status} before lockout`);
    }

    expect(armed, `lockout never armed after ${refused} refusals`).toBe(true);
    // the budget is real: it refused several attempts before locking
    expect(refused).toBeGreaterThan(0);

    const blocked = await login(request, zaphod.email, 'WrongPass123!');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Too many attempts' });

    // per-IP, not per-account: correct credentials for a different seeded user
    // are refused too, and the limiter runs before the password is even checked
    const other = await login(request, tim.email, tim.password);
    expect(other.status).toBe(429);
    expect(other.body).toEqual({ error: 'Too many attempts' });
  });
});
