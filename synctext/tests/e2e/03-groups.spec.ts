import { test, expect, loginAsSeed } from './fixtures/auth';
import { ROUTES } from './utils/test-helpers';

/*
UI map (read from source):
  sidebar toggle (icon only, no accessible name)      dashboard-client.tsx:150
  accordion trigger "Groups"                           DashboardSidebar.tsx:284
  "New group" button inside that section              DashboardSidebar.tsx:299
  dialog label "Group name", submit "Create"/"Rename"  GroupNameDialog.tsx:41,47
  row button text = groupLabel(group)                  DashboardSidebar.tsx:313
  row menu trigger  aria-label "Actions for <label>"   DashboardSidebar.tsx:320
  owner menu: Rename group / Add member / Leave group / Delete group
                                                     DashboardSidebar.tsx:203-231
  delete confirm dialog, confirm button "Delete"      ManagerDialog.tsx:95
  private space label is "My private docs"             group/group.ts:6

Every group created here is deleted again, so the seed stays untouched.
*/

// >900px keeps the sidebar on screen; below that it is off-canvas behind the
// icon-only hamburger, which has no accessible name to click.
test.use({ viewport: { width: 1440, height: 900 } });

async function openGroups(page: import('@playwright/test').Page) {
  await page.goto(ROUTES.dashboard);
  // the dashboard hydrates after its parallel fetches; clicking before the
  // handlers attach silently does nothing, so wait for the fetches to settle
  await page.waitForLoadState('networkidle');
  const newGroup = page.getByRole('button', { name: /new group/i });
  if (!(await newGroup.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /^Groups$/ }).click();
  }
  await expect(newGroup).toBeVisible();
}

async function createGroup(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: /new group/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Group name').fill(name);
  await dialog.getByRole('button', { name: /^Create$/ }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
}

async function openGroupMenu(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: `Actions for ${name}` }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu;
}

async function deleteGroup(page: import('@playwright/test').Page, name: string) {
  const menu = await openGroupMenu(page, name);
  await menu.getByRole('menuitem', { name: /delete group/i }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toBeVisible();
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/groups/') && r.request().method() === 'DELETE',
    ),
    confirm.getByRole('button', { name: /^Delete$/ }).click(),
  ]);
  expect(response.status()).toBe(204); // app/api/groups/[id]/route.ts:75
  await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
}

test.describe('Groups', () => {
  test('creates a group and it appears in the sidebar', async ({ loggedInPage }) => {
    const name = `E2E Created ${Date.now()}`;
    await openGroups(loggedInPage);
    await createGroup(loggedInPage, name);

    // selecting a group is what shows its documents
    await loggedInPage.getByRole('button', { name, exact: true }).click();
    await expect(loggedInPage.getByRole('button', { name, exact: true })).toHaveClass(
      /SidebarGroupActive/,
    );

    await deleteGroup(loggedInPage, name);
  });

  test('owner can rename a group', async ({ loggedInPage }) => {
    const from = `E2E Rename ${Date.now()}`;
    const to = `${from} v2`;
    await openGroups(loggedInPage);
    await createGroup(loggedInPage, from);

    const menu = await openGroupMenu(loggedInPage, from);
    await menu.getByRole('menuitem', { name: /rename group/i }).click();
    const dialog = loggedInPage.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Group name').fill(to);
    await dialog.getByRole('button', { name: /^Rename$/ }).click();
    await expect(dialog).toBeHidden();

    await expect(loggedInPage.getByRole('button', { name: to, exact: true })).toBeVisible();
    await expect(loggedInPage.getByRole('button', { name: from, exact: true })).toHaveCount(0);

    await deleteGroup(loggedInPage, to);
  });

  test('private space has no group actions', async ({ loggedInPage }) => {
    await openGroups(loggedInPage);
    // groupActions() returns [] for the private space, so ActionMenu renders
    // nothing at all - not even the trigger (ActionMenu.tsx:19)
    await expect(
      loggedInPage.getByRole('button', { name: 'Actions for My private docs' }),
    ).toHaveCount(0);
    await expect(loggedInPage.getByRole('button', { name: 'My private docs', exact: true })).toBeVisible();
  });

  test('owner sees rename and delete, admin does not', async ({ browser }) => {
    const ownerCtx = await browser.newContext();
    const adminCtx = await browser.newContext();
    const alicePage = await ownerCtx.newPage();
    const bobPage = await adminCtx.newPage();
    await loginAsSeed(alicePage, 'alice');
    await loginAsSeed(bobPage, 'bob');

    // alice owns "synctext", bob is only ADMIN there
    await openGroups(alicePage);
    const ownerMenu = await openGroupMenu(alicePage, 'synctext');
    await expect(ownerMenu.getByRole('menuitem', { name: /rename group/i })).toBeVisible();
    await expect(ownerMenu.getByRole('menuitem', { name: /delete group/i })).toBeVisible();
    await expect(ownerMenu.getByRole('menuitem', { name: /add member/i })).toBeVisible();
    await expect(ownerMenu.getByRole('menuitem', { name: /leave group/i })).toBeVisible();
    await alicePage.keyboard.press('Escape');

    await openGroups(bobPage);
    const adminMenu = await openGroupMenu(bobPage, 'synctext');
    await expect(adminMenu.getByRole('menuitem', { name: /add member/i })).toBeVisible();
    await expect(adminMenu.getByRole('menuitem', { name: /leave group/i })).toBeVisible();
    await expect(adminMenu.getByRole('menuitem', { name: /rename group/i })).toHaveCount(0);
    await expect(adminMenu.getByRole('menuitem', { name: /delete group/i })).toHaveCount(0);

    await ownerCtx.close();
    await adminCtx.close();
  });

  test('plain member can only leave', async ({ browser }) => {
    const ctx = await browser.newContext();
    const timPage = await ctx.newPage();
    await loginAsSeed(timPage, 'tim');

    // tim is a MEMBER of synctext, not an admin
    await openGroups(timPage);
    const menu = await openGroupMenu(timPage, 'synctext');
    await expect(menu.getByRole('menuitem', { name: /leave group/i })).toBeVisible();
    await expect(menu.getByRole('menuitem')).toHaveCount(1);

    await ctx.close();
  });
});
