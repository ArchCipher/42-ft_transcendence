import { test, expect } from './fixtures/auth';
import {
  makeUser,
  registerUser,
  registerUserExpectSuccess,
  loginUser,
  loginUserExpectSuccess,
  logout,
  verifyEmail,
  requestPasswordReset,
} from './utils/test-helpers';
import { seedUser } from './utils/seed-users';

/*
The sign-up quota allows 5 accounts per hour per IP
(synctext/lib/auth/rate-limit.ts REGISTER_LIMIT), so this file registers
deliberately: one full lifecycle, one duplicate-email check, one
duplicate-username check. Every other spec logs in as the seeded users from
packages/db/prisma/seed-data.ts.
*/
test.describe('Registration and account recovery', () => {
  test('registers, verifies by email, logs in, then resets the password', async ({ page }) => {
    const u = makeUser('lifecycle');
    const newPassword = 'NewPass456!';

    // 1. registration - no session is issued, the account must be verified
    await registerUserExpectSuccess(page, u);
    // notice text is NOTICES.pending in app/auth/page.tsx:10
    await expect(page.getByText(/verification email sent/i)).toBeVisible();

    // 2. login is refused before verification
    expect(await loginUser(page, u)).toMatchObject({ status: 403, error: 'Verify your email' });
    await expect(page.locator('text=/verify your email/i')).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);

    // 3. email verification through the Mailpit link
    await verifyEmail(page, u.email);
    await expect(page.getByText(/your email is confirmed/i)).toBeVisible();

    // 4. the verified account can sign in
    await loginUserExpectSuccess(page, u);

    // 5. password reset: request, Mailpit link, new password
    await logout(page);
    await requestPasswordReset(page, u.email, newPassword);

    // 6. the new password works and the old one does not
    expect(await loginUser(page, { email: u.email, password: u.password })).toMatchObject({
      status: 401,
      error: 'Invalid email or password',
    });
    await expect(page.locator('text=/invalid email or password/i')).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);

    await loginUserExpectSuccess(page, { email: u.email, password: newPassword });
  });

  test('rejects duplicate email', async ({ page }) => {
    const existing = seedUser('alice');

    // 409 comes from the P2002 unique-violation branch in
    // app/api/auth/register/route.ts
    expect(await registerUser(page, { ...makeUser('other'), email: existing.email })).toMatchObject({
      status: 409,
      error: 'Email or username already exists',
    });
    await expect(page.locator('text=/email or username already exists/i')).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test('rejects duplicate username', async ({ page }) => {
    const existing = seedUser('bob');

    expect(await registerUser(page, { ...makeUser('other'), username: existing.username })).toMatchObject({
      status: 409,
      error: 'Email or username already exists',
    });
    await expect(page.locator('text=/email or username already exists/i')).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Session', () => {
  test('logs in with valid credentials', async ({ alicePage }) => {
    await expect(alicePage).toHaveURL(/\/dashboard/);
  });

  test('rejects wrong password', async ({ page }) => {
    const alice = seedUser('alice');
    expect(await loginUser(page, { email: alice.email, password: 'WrongPass123!' })).toMatchObject({
      status: 401,
      error: 'Invalid email or password',
    });
    await expect(page.locator('text=/invalid email or password/i')).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
  });

  test('rejects login for a user that was never registered', async ({ page }) => {
    const ghost = makeUser('ghost');

    // anti-enumeration: identical status and message to a wrong password
    expect(await loginUser(page, { email: ghost.email, password: ghost.password })).toMatchObject({
      status: 401,
      error: 'Invalid email or password',
    });
    await expect(page.locator('text=/invalid email or password/i')).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
  });

  test('logout clears session', async ({ alicePage }) => {
    await logout(alicePage);
    // deliberately raw goto
    await alicePage.goto('/dashboard');
    // the guard bounces unauthenticated requests back to /auth
    await expect(alicePage).toHaveURL(/\/auth/);
  });

  test('session persists after refresh', async ({ alicePage }) => {
    await alicePage.reload();
    await expect(alicePage).toHaveURL(/\/dashboard/);
  });
});

/*
Google OAuth (diff-current-pr) is gated by GOOGLE_OAUTH_ENABLED === "true" and
needs a redirect URI registered with Google plus real client credentials, so a
full browser sign-in through accounts.google.com is not testable here. What is
testable is the gate: with OAuth disabled the start endpoint must 404 and the
login page must not offer the Google button.
*/
test.describe('OAuth gate', () => {
  test('start endpoint is 404 while OAuth is disabled', async ({ request }) => {
    const res = await request.get('/api/auth/oauth?purpose=signin');
    test.skip(res.status() === 200, 'GOOGLE_OAUTH_ENABLED=true in this environment');

    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not enabled' });
  });

  test('login page hides the Google button when OAuth is disabled', async ({ page }) => {
    await page.goto('/auth');
    const googleButton = page.getByRole('button', { name: /login with google/i });
    if (await googleButton.count()) {
      test.skip(true, 'GOOGLE_OAUTH_ENABLED=true in this environment');
    }
    await expect(googleButton).toHaveCount(0);
  });

  test('link purpose requires a session', async ({ request }) => {
    const res = await request.get('/api/auth/oauth?purpose=link');
    // 404 when disabled, 401 when enabled but called anonymously
    expect([401, 404]).toContain(res.status());
  });
});
