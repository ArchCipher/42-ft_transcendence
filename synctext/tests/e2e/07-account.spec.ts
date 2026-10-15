import { test, expect } from './fixtures/auth';
import { seedUser } from './utils/seed-users'
import {
  makeUser,
  registerUserExpectSuccess,
  verifyEmail,
  loginUserExpectSuccess,
  logout,
  gotoDashboard,
  ROUTES
} from './utils/test-helpers';

/*
Account deletion cannot run against a seeded user: it would destroy the fixture
every other spec logs in as, and nothing here re-creates it. So this spec owns
exactly ONE throwaway account and walks it through its whole life:

  register -> verify -> login -> logout -> login again -> delete

That keeps the suite at 4 signups (3 in 01-auth.spec.ts + 1 here) against
REGISTER_LIMIT of 5 successes per hour (lib/auth/rate-limit.ts:45), leaving one
slot of headroom for a retry. Splitting "logout" and "delete" into two tests
would cost a fifth signup and sit exactly on the cap, where a single retried
test would lock out every other registration.

The order matters: the account is only deleted at the very end, so the logout
half can still prove the credentials survived while the delete half proves they
did not.

UI map (read from source):
  /profile -> "Delete account" opens a ConfirmWindow whose confirm button is
  also "Delete account" (app/profile/danger-zone.tsx:58,66)
  DELETE /api/account -> 204, then notifySignedOut() + router.push(LOGGED_OUT_URL)
*/

test.describe('Account & Profile', () => {
  test('an account can be logged out of and then deleted for good', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const user = makeUser('acct');
    await registerUserExpectSuccess(page, user);
    await verifyEmail(page, user.email);

    // an unverified account cannot log in, so verification is on the path here
    await loginUserExpectSuccess(page, user);

    // logout clears the session but leaves the account intact
    await logout(page);
    await page.goto(ROUTES.dashboard);
    await expect(page).toHaveURL(/\/auth/);
    await loginUserExpectSuccess(page, user);

    // deleting it is the same flow, from the profile page
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Delete account' }).click();

    const confirm = page.locator('.ConfirmWindow');
    await expect(confirm).toBeVisible();
    const [deleted] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/account') && r.request().method() === 'DELETE',
      ),
      confirm.getByRole('button', { name: 'Delete account' }).click(),
    ]);
    expect(deleted.status()).toBe(204);

	// firefox: NS_BINDING_ABORTED, webkit: interrupted by another navigation
	await expect(page).toHaveURL(/verify=logged-out/);

    // signed out for good: the protected routes bounce to /auth again
    await page.goto(ROUTES.dashboard);
    await expect(page).toHaveURL(/\/auth/);
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/auth/);

    // and the credentials are gone, not merely the cookie
    const relogin = await page.request.post('/api/auth/login', {
      data: { email: user.email, password: user.password },
    });
    expect(relogin.status()).toBe(401);

    await context.close();
  });

  test('a session stops working once it is no longer one of the 5 kept', async ({
    browser,
  }) => {
	test.setTimeout(240_000);
    // Seeds are enough here: this needs several sessions for one user, not a new
    // account, so it costs no sign-up quota. MAX_SESSIONS = 5
    // (lib/auth/session.ts:16) and the login route revokes the older rows
    // (app/api/auth/login/route.ts:112-121).
    //
    // This is the same end of the session as the two hour idle timeout:
    // validateSession() returns null, requireSession() signs the user out and
    // redirects to /auth (lib/auth/guard.ts:22). Only the reason the row became
    // invalid differs - revoked here, idle there - so the two hour threshold
    // itself is unit tested in tests/auth/10-session.test.ts:147 rather than
    // waited out here.
    const alice = seedUser('alice');
    const contexts = [];
    for (let i = 0; i < 6; i++) {
      const context = await browser.newContext();
      await loginUserExpectSuccess(await context.newPage(), alice);
      contexts.push(context);
    }

    // the five newest sessions still work
    for (const context of contexts.slice(1)) {
      const page = await context.newPage();
      await gotoDashboard(page);
      await expect(page).toHaveURL(/\/dashboard/);
    }

    // the sixth login revoked the oldest, so that one is now a guest
    const stale = await contexts[0].newPage();
    // deliberately raw goto
    await stale.goto('/dashboard');
    await expect(stale).toHaveURL(/\/auth/);

    for (const context of contexts) await context.close();
  });
});
