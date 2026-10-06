import { test as base, Page, Browser } from '@playwright/test';
import { makeUser, loginUserExpectSuccess, registerAndLogin } from '../utils/test-helpers';
import { seedUser, SeedUser, SeedUserName } from '../utils/seed-users';

type AuthFixtures = {
  // random user, for the registration/verification flow only
  freshUser: SeedUser;
  // alias of freshUser: the specs in 02-09 were written against `{ user }`
  user: SeedUser;
  // authenticated as seeded alice; alias kept for the 03/04/09 specs
  loggedInPage: Page;
  // seeded users (already verified) - log in without registering
  alicePage: Page;
  bobPage: Page;
  timPage: Page;
  zaphodPage: Page;
};

async function seededContext(browser: Browser, key: SeedUserName) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAsSeed(page, key);
  return { context, page };
}

async function loginAsSeed(page: Page, key: SeedUserName) {
  const user = seedUser(key);
  await loginUserExpectSuccess(page, user);
  return user;
}

export const test = base.extend<AuthFixtures>({
  freshUser: async ({}, use) => {
    await use(makeUser());
  },

  // same object as freshUser, so `{ user }` and `{ freshUser }` never disagree
  user: async ({ freshUser }, use) => {
    await use(freshUser);
  },

  alicePage: async ({ browser }, use) => {
    const { context, page } = await seededContext(browser, 'alice');
    await use(page);
    await context.close();
  },

  bobPage: async ({ browser }, use) => {
    const { context, page } = await seededContext(browser, 'bob');
    await use(page);
    await context.close();
  },

  timPage: async ({ browser }, use) => {
    const { context, page } = await seededContext(browser, 'tim');
    await use(page);
    await context.close();
  },

  zaphodPage: async ({ browser }, use) => {
    const { context, page } = await seededContext(browser, 'zaphod');
    await use(page);
    await context.close();
  },

  // same page object as alicePage
  loggedInPage: async ({ alicePage }, use) => {
    await use(alicePage);
  },
});

// Kept for specs that must exercise the real signup + email verification path.
export { registerAndLogin, loginAsSeed, seedUser };
export { expect } from '@playwright/test';
