import { test, expect } from './fixtures/auth';
import {
  makeUser,
  registerUserExpectSuccess,
  verifyEmail,
  waitForHydrated,
} from './utils/test-helpers';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/*
Resend-verification, end to end. Nothing else in the suite covers this flow:
01-auth verifies with the REGISTER link, forgot-password covers the other
EmailAuthForm twin, and the resend endpoint itself only appears in
14-authorization's public-endpoint list.

The first test pins the reported bug: clicking "Resend verification?" on the
login page must open /resend-verification - not silently stay on /auth - and
the form must actually render. submitResend re-checks the same two things on
every use so a dead route fails with a specific assertion instead of a
generic 30s fill timeout.

Quota note: each test registers one account (sign-up quota is 5/hour/IP, held in
web process memory, and 01+07+11+12+14's sweep spend all 5 slots in a full run).
A standalone run passes only because run-e2e.sh restarts web before the suite -
that restart cannot cover this file, whose registrations happen mid-suite. So
beforeAll restarts web here: it clears the in-memory limiter without touching the
database, which is what the specs after this one still need.
*/

/*
Single-argument hook (TestInfo is only passed as the second argument, which
would need an unused first parameter and risks the linter's unused-vars rule).
Path discovery mirrors run-e2e.sh's find_app_dir: db-state.sh finds the compose
project directory itself, so all we need is the script's location relative to
wherever playwright was started.
Timeout note: set on the hook, not the tests - Playwright docs, "Changing
timeout for a beforeAll hook". execFileSync gets its own, slightly smaller
timeout because a sync call cannot be interrupted by a hook timeout.
*/
test.beforeAll(async () => {
  test.setTimeout(180_000);

  let dir = process.cwd();
  const script = (() => {
    for (;;) {
      const candidate = join(dir, 'tests', 'db-state.sh');
      if (existsSync(candidate)) return candidate;
      const parent = dirname(dir);
      if (parent === dir) {
        throw new Error(`tests/db-state.sh not found above ${process.cwd()}`);
      }
      dir = parent;
    }
  })();

  execFileSync('bash', [script, 'restart'], {
    stdio: 'inherit',
    timeout: 150_000,
  });
});


const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';
const SUBJECT = 'Verify your email';

type MailpitMessage = {
  ID: string;
  Subject?: string;
  To?: Array<{ Address?: string }>;
};

async function messagesFor(email: string): Promise<MailpitMessage[]> {
  const res = await fetch(`${MAILPIT}/api/v1/messages?limit=200`);
  if (!res.ok) throw new Error(`Mailpit list failed: ${res.status}`);
  const body = (await res.json()) as { messages?: MailpitMessage[] };
  return (body.messages ?? []).filter(
    (m) =>
      m.Subject === SUBJECT &&
      (m.To ?? []).some(
        (t) => t.Address?.toLowerCase() === email.toLowerCase(),
      ),
  );
}

// poll: the email is sent with the 201/200, but Mailpit delivery is async
async function waitForMessageCount(
  email: string,
  count: number,
  timeoutMs = 15_000,
): Promise<MailpitMessage[]> {
  const deadline = Date.now() + timeoutMs;
  let found: MailpitMessage[] = [];
  while (Date.now() < deadline) {
    found = await messagesFor(email);
    if (found.length >= count) return found;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `expected ${count} "${SUBJECT}" message(s) for ${email}, saw ${found.length}`,
  );
}

function newest(messages: MailpitMessage[]): MailpitMessage {
  return [...messages].sort((a, b) => {
    // IDs are numeric strings once the counter passes 9, where a plain
    // localeCompare would rank "9" above "10"
    const na = Number(a.ID);
    const nb = Number(b.ID);
    if (Number.isFinite(na) && Number.isFinite(nb)) return nb - na;
    return b.ID.localeCompare(a.ID);
  })[0]!;
}

async function pollForNewerMessage(email:string, excludedId: string, timeoutMs = 15_000):Promise<MailpitMessage>{
	const deadline = Date.now() + timeoutMs;
	while(Date.now() < deadline) {
		const newer = (await messagesFor(email)).filter((m)=>m.ID !== excludedId);
		if (newer.length >= 1) return newest(newer);
		await new Promise((resolve)=> setTimeout(resolve, 250));
	}
	throw new Error(`no new message after resend for ${email}`);
}

async function verifyLink(message: MailpitMessage): Promise<string> {
  const res = await fetch(`${MAILPIT}/api/v1/message/${message.ID}`);
  if (!res.ok) throw new Error(`Mailpit message fetch failed: ${res.status}`);
  const detail = (await res.json()) as { HTML?: string; Text?: string };
  const body = `${detail.HTML ?? ''}\n${detail.Text ?? ''}`;
  const match = body.match(
    /https?:\/\/[^\s"'<>]*\/verify-email\?token=[^\s"'<>&]+/,
  );
  if (!match) throw new Error(`no /verify-email link in message ${message.ID}`);
  return match[0].replace(/&amp;/g, '&');
}

async function submitResend(page: import('@playwright/test').Page, email: string) {
  await page.goto('/resend-verification');
  // a bounce to /auth (or a 404 page left at the same URL) must fail here
  // with a clear cause, not 30 seconds later inside getByLabel().fill()
  await expect(
    page.getByRole('button', { name: /send verification email/i }),
    'the resend form must render on /resend-verification',
  ).toBeVisible();
  await waitForHydrated(page);
  await page.getByLabel(/email/i).fill(email);
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/api/auth/resend-verification') &&
        r.request().method() === 'POST',
    ),
    page.getByRole('button', { name: /send verification email/i }).click(),
  ]);
  await page.waitForURL(/\/auth\?verify=resend-sent/);
  return { status: response.status(), body: await response.json() };
}

test.describe('Resend verification', () => {
  // reported: clicking the link never opens the page (stays on /auth), so no
  // email is ever sent. Reproduces the click itself - no registration needed.
  test('the Resend verification? link on the login page opens the form', async ({
    page,
  }) => {
    await page.goto('/auth');
    await waitForHydrated(page);

    await page.getByRole('link', { name: /resend verification/i }).click();

    await expect(page).toHaveURL(/\/resend-verification/);
    await expect(
      page.getByRole('button', { name: /send verification email/i }),
      'the resend form must render after the link click',
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('the resent link verifies the account and replaces the register link', async ({
    page,
  }) => {
    const u = makeUser('resend');

    await registerUserExpectSuccess(page, u);
    const first = await waitForMessageCount(u.email, 1);
	const registerMsg = newest(first);
    const registerLink = await verifyLink(registerMsg);

    // ask for a fresh link through the UI, exactly like a user would
    const { status } = await submitResend(page, u.email);
    expect(status).toBe(200);

	// immune to Mailpit list order
	const resentMsg = await pollForNewerMessage(u.email, registerMsg.ID);
	const resentLink = await verifyLink(resentMsg);
    expect(resentLink, `resend link must differ from register link\n register: ${registerLink}\n resent: ${resentLink}`).not.toBe(registerLink);

    await page.goto(resentLink);
    await expect(page.getByText(/your email is confirmed/i)).toBeVisible();

    // resend deletes every still-valid token (route.ts deleteMany expiresAt >
    // now), so the register link must now be dead - clicking the OLDER of the
    // two Mailpit emails is the classic "the link doesn't work" report
    await page.goto(registerLink);
    await expect(
      page.getByText(/invalid or expired verification link/i),
    ).toBeVisible();
  });

  test('a resend for an already-verified address answers 200 and sends nothing', async ({
    page,
  }) => {
    const u = makeUser('resend2');
    await registerUserExpectSuccess(page, u);
    await verifyEmail(page, u.email);
    const before = await messagesFor(u.email);
    expect(before.length).toBe(1);

    // anti-enumeration: the answer must be identical to the sending case
    const { status, body } = await submitResend(page, u.email);
    expect(status).toBe(200);
    expect(body).toEqual({ ok: 'Check your email to verify your account' });

    // ...but no second email may go out
    await page.waitForTimeout(1500);
    const after = await messagesFor(u.email);
    expect(after.length, 'no mail may be sent to an already-verified address').toBe(
      before.length,
    );
  });
});
