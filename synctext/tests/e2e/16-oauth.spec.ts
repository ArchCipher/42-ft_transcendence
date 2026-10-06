import { test, expect } from './fixtures/auth';
import type { APIRequestContext } from '@playwright/test';
import { loginUserExpectSuccess } from './utils/test-helpers';
import { seedUser, type SeedUser } from './utils/seed-users';

/*
Google OAuth, both sides of the gate.

A full browser sign-in through accounts.google.com needs real client
credentials, a redirect URI registered with Google and a Google account, so
the happy path ends at the provider's front door (01-auth.spec.ts documents
the same boundary). Everything the app owns on the way there and back is
asserted here:

  - start: OIDC/PKCE parameters, per-attempt state, purpose validation,
    the session requirement for purpose=link
  - callback: stable error redirects for missing/unknown/denied requests,
    and the single-use property - a consumed state can never be replayed
  - unlink: session gate, payload validation, idempotent no-op for a
    password-only account
  - UI: the Google button sits next to the password form, actually navigates
    to the provider with the right parameters, and the profile page offers
    linking only while OAuth is enabled
  - coexistence: password sign-in keeps working while Google is offered

None of the callback paths here reaches Google's token endpoint:
`error=access_denied` is rejected by `validateAuthResponse` before the grant
request (lib/auth/oauth/identity.ts), and missing/unknown states fail in
`consumeTransaction` before the exchange begins. The only outbound call is
the OIDC discovery document (accounts.google.com/.well-known/..., cached in
the server process for an hour).

Denial callbacks carry `iss=https://accounts.google.com` because
oauth4webapi validates the RFC 9207 issuer parameter before it looks at the
`error` parameter - Google's discovery document advertises
`authorization_response_iss_parameter_supported`, so a denial URL without
`iss` throws OperationProcessingError, which the callback route's generic
catch turns into `invalid_code` instead of `denied`. Google always sends
`iss` in real responses; these synthetic URLs mirror that. (If the issuer
flag were false, `iss` simply matches `as.issuer` and is ignored.)

The mode is detected at runtime from the start endpoint itself (302 =
enabled, 404 = disabled), so the file passes in both configurations.
*/

type Probe = { status: number; location: string };

async function probeStart(
  request: APIRequestContext,
  purpose = 'signin',
): Promise<Probe> {
  const res = await request.get(`/api/auth/oauth?purpose=${purpose}`, {
    maxRedirects: 0,
  });
  return { status: res.status(), location: res.headers()['location'] ?? '' };
}

async function getCallback(
  request: APIRequestContext,
  query = '',
): Promise<Probe> {
  const res = await request.get(`/api/auth/oauth/callback${query}`, {
    maxRedirects: 0,
  });
  return { status: res.status(), location: res.headers()['location'] ?? '' };
}

function expectErrorRedirect(probe: Probe, pathname: string, code: string) {
  expect(probe.status, `got location=${probe.location || '(none)'}`).toBe(302);
  const url = new URL(probe.location);
  expect(url.pathname).toBe(pathname);
  expect(url.searchParams.get('error')).toBe(code);
}

function stateOf(probe: Probe): string {
  const state = new URL(probe.location).searchParams.get('state');
  expect(state, `no state in ${probe.location}`).toBeTruthy();
  return state!;
}

async function apiLogin(request: APIRequestContext, user: SeedUser) {
  const res = await request.post('/api/auth/login', {
    data: { email: user.email, password: user.password },
  });
  expect(res.status(), await res.text()).toBe(200);
}

const DISABLED = 'GOOGLE_OAUTH_ENABLED is not "true" in this environment';

test.describe('OAuth start endpoint', () => {
  test('builds a well-formed authorization request', async ({ request }) => {
    const probe = await probeStart(request);
    test.skip(probe.status === 404, DISABLED);
    expect(probe.status).toBe(302);

    const url = new URL(probe.location);
    expect(url.host).toBe('accounts.google.com');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('prompt')).toBe('select_account');
    expect(url.searchParams.get('redirect_uri')).toMatch(
      /\/api\/auth\/oauth\/callback$/,
    );
    expect(url.searchParams.get('client_id')).toBeTruthy();
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('nonce')).toBeTruthy();
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
  });

  test('issues a fresh state for every attempt', async ({ request }) => {
    const first = await probeStart(request);
    const second = await probeStart(request);
    test.skip(first.status === 404, DISABLED);

    expect(first.status).toBe(302);
    expect(second.status).toBe(302);
    expect(stateOf(first)).not.toBe(stateOf(second));
  });

  test('rejects an unknown purpose', async ({ request }) => {
    const res = await request.get('/api/auth/oauth?purpose=reset', {
      maxRedirects: 0,
    });
    test.skip(res.status() === 404, DISABLED);

    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid request' });
  });

  test('accepts purpose=link only with a session', async ({ request }) => {
    const anonymous = await probeStart(request, 'link');
    test.skip(anonymous.status === 404, DISABLED);
    expect(anonymous.status).toBe(401);

    await apiLogin(request, seedUser('alice'));

    const linked = await probeStart(request, 'link');
    expect(linked.status).toBe(302);
    const url = new URL(linked.location);
    expect(url.host).toBe('accounts.google.com');
    expect(url.searchParams.get('redirect_uri')).toMatch(
      /\/api\/auth\/oauth\/callback$/,
    );
  });
});

test.describe('OAuth callback', () => {
  test('rejects a callback with no state', async ({ request }) => {
    const probe = await getCallback(request);
    test.skip(probe.status === 404, DISABLED);

    expectErrorRedirect(probe, '/auth', 'invalid_state');
  });

  test('rejects an unknown state before any exchange', async ({ request }) => {
    const probe = await getCallback(request, '?state=not-a-real-state');
    test.skip(probe.status === 404, DISABLED);

    expectErrorRedirect(probe, '/auth', 'invalid_state');
  });

  test('a denied consent consumes its state, so it cannot be replayed', async ({
    request,
  }) => {
    const start = await probeStart(request);
    test.skip(start.status === 404, DISABLED);
    expect(start.status).toBe(302);
    const state = stateOf(start);

    // provider said no: land on /auth with a stable code
    const denied = await getCallback(
      request,
      `?state=${encodeURIComponent(state)}&error=access_denied&iss=${encodeURIComponent('https://accounts.google.com')}`,
    );
    expectErrorRedirect(denied, '/auth', 'denied');

    // the transaction was spent by the failure above - state is single-use
    // even on the denial path (lib/auth/oauth/transaction.ts)
    const replay = await getCallback(
      request,
      `?state=${encodeURIComponent(state)}&error=access_denied&iss=${encodeURIComponent('https://accounts.google.com')}`,
    );
    expectErrorRedirect(replay, '/auth', 'invalid_state');
  });

  test('a denied link returns to the profile page', async ({ request }) => {
    const anonymous = await probeStart(request, 'link');
    test.skip(anonymous.status === 404, DISABLED);
    expect(anonymous.status).toBe(401);

    await apiLogin(request, seedUser('alice'));
    const linkStart = await probeStart(request, 'link');
    expect(linkStart.status).toBe(302);
    const state = stateOf(linkStart);

    const denied = await getCallback(
      request,
      `?state=${encodeURIComponent(state)}&error=access_denied&iss=${encodeURIComponent('https://accounts.google.com')}`,
    );
    expectErrorRedirect(denied, '/profile', 'denied');
  });

  test('is 404 while OAuth is disabled', async ({ request }) => {
    const res = await request.get('/api/auth/oauth/callback?state=anything', {
      maxRedirects: 0,
    });
    test.skip(res.status() !== 404, 'GOOGLE_OAUTH_ENABLED=true in this environment');

    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not enabled' });
  });
});

test.describe('OAuth unlink endpoint', () => {
  test('requires a session', async ({ request }) => {
    const res = await request.post('/api/auth/oauth/unlink', {
      data: { provider: 'google' },
    });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: 'Not authenticated' });
  });

  test('refuses an unknown provider', async ({ request }) => {
    await apiLogin(request, seedUser('alice'));

    const res = await request.post('/api/auth/oauth/unlink', {
      data: { provider: 'github' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
    expect(body.fields?.provider).toBeDefined();
  });

  test('is a no-op for a password account with nothing linked', async ({
    request,
  }) => {
    await apiLogin(request, seedUser('alice'));

    // unlinkAccount deletes matching rows only; alice never linked Google,
    // and she keeps a password, so nothing blocks and nothing is removed
    const res = await request.post('/api/auth/oauth/unlink', {
      data: { provider: 'google' },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

test.describe('OAuth in the browser', () => {
  test('login page offers Google sign-in next to the password form', async ({
    page,
  }) => {
    const probe = await probeStart(page.request);
    test.skip(probe.status === 404, DISABLED);

    await page.goto('/auth');
    await expect(page.getByRole('button', { name: /^login$/i })).toBeVisible();
    const google = page.getByRole('button', { name: /login with google/i });
    await expect(google).toBeVisible();

    // the real provider is not reachable with test credentials: answer the
    // navigation locally so the redirect can still be inspected
    await page.route('https://accounts.google.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>google stub</title>',
      }),
    );
    await google.click();
    await page.waitForURL(/https:\/\/accounts\.google\.com\//);

    const target = new URL(page.url());
    expect(target.searchParams.get('response_type')).toBe('code');
    expect(target.searchParams.get('scope')).toBe('openid email');
    expect(target.searchParams.get('code_challenge_method')).toBe('S256');
    expect(target.searchParams.get('redirect_uri')).toMatch(
      /\/api\/auth\/oauth\/callback$/,
    );
    expect(target.searchParams.get('client_id')).toBeTruthy();
    expect(target.searchParams.get('state')).toBeTruthy();
  });

  test('profile offers to link Google only while OAuth is enabled', async ({
    alicePage,
  }) => {
    const probe = await probeStart(alicePage.request);
    await alicePage.goto('/profile');
    const link = alicePage.getByRole('button', { name: /link google account/i });

    if (probe.status === 302) {
      await expect(link).toBeVisible();
    } else {
      expect(probe.status).toBe(404);
      await expect(link).toHaveCount(0);
    }
  });

  test('a password user still signs in while Google is offered', async ({
    page,
  }) => {
    // guards the coexistence requirement: enabling Google must not disturb
    // the email + password path (01-auth covers it in isolation)
    await loginUserExpectSuccess(page, seedUser('alice'));
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
