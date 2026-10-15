import { test, expect } from './fixtures/auth';

/*
Route map (read from source) - the login page is /auth, there is no /login:
  /authapp/auth/page.tsx, public
  /register             app/register/page.tsx, public
  /                    app/page.tsx, public
  /dashboard            app/dashboard/page.tsx -> requireSession()
  /profile              app/profile/page.tsx -> requireSession()
  /doc/[id]             app/doc/[id]/page.tsx:45 -> redirect("/auth")

requireSession() redirects to /auth, or to /api/auth/logout first when a stale
session cookie is present (lib/auth/guard.ts:22).

This file deliberately imports nothing but the shared fixtures: a guest has no
session, so there is no seed user to log in as.
*/

test.describe('Guest session', () => {
  test('public pages are reachable without a session', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/auth');
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();

    await page.goto('/register');
    await expect(page).toHaveURL(/\/register/);
  });

  test('protected routes send a guest to /auth', async ({ page }) => {
    for (const path of ['/dashboard', '/profile', '/doc/some-id']) {
      // deliberately raw goto
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('the guest is offered a way to sign in, not a session', async ({ page }) => {
    // deliberately raw goto
    await page.goto('/dasboard');
    await expect(page).toHaveURL(/\/auth/);

    // bad credentials keep a guest on the page and leak nothing about the account
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST',
      ),
      (async () => {
        await page.getByLabel(/email/i).fill('nobody@test.local');
        await page.getByLabel('Password', { exact: true }).fill('WrongPass123!');
        await page.getByRole('button', { name: /^Login$/ }).click();
      })(),
    ]);
    expect(response.status()).toBe(401);
    await expect(page.locator('text=/invalid email or password/i')).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
  });
});
