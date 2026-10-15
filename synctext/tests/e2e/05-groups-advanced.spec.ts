import { test, expect } from './fixtures/auth';
import { seedUser } from './utils/seed-users';
import { gotoDashboard } from './utils/test-helpers';

/*
UI map (read from source):
  group row + menu "Actions for <label>"     DashboardSidebar.tsx:313,320
  owner menu: Rename group / Add member / Leave group / Delete group
  member row menu "Actions for <username>"   DashboardSidebar.tsx:340
    Make admin / Revoke admin / Make owner / Remove member
                                          DashboardSidebar.tsx:246-268
  AddMemberDialog lists the owner's *friends*, one Add button per row - there is
  no input, so a non-friend cannot be added at all (AddMemberDialog.tsx:70)
  role badge only renders when role !== MEMBER  DashboardSidebar.tsx:338

Seed relationships this relies on (packages/db/prisma/seed-data.ts):
  alice owns `synctext`, and is friends with bob and tim, so she can build a
  throwaway group and populate it from her own friend list. Each test deletes
  the group it created, so the seeded groups are never touched.
*/

async function createGroupViaUi(page: import('@playwright/test').Page, name: string) {
  await gotoDashboard(page);
  await page.waitForLoadState('networkidle');

  const newGroup = page.getByRole('button', { name: /new group/i });
  if (!(await newGroup.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /^Groups$/ }).click();
  }
  await newGroup.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const [created] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith('/api/groups') && r.request().method() === 'POST',
    ),
    (async () => {
      await dialog.getByLabel('Group name').fill(name);
      await dialog.getByRole('button', { name: /^Create$/ }).click();
    })(),
  ]);
  expect(created.status(), `POST /api/groups: ${await created.text()}`).toBe(201);
  const group = (await created.json()) as { id: string };
  await expect(dialog).toBeHidden();
  return group.id;
}

async function addMemberViaDialog(
  page: import('@playwright/test').Page,
  groupName: string,
  username: string,
) {
  await page.getByRole('button', { name: `Actions for ${groupName}` }).click();
  await page.getByRole('menuitem', { name: 'Add member' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog
    .locator('li')
    .filter({ hasText: username })
    .getByRole('button', { name: 'Add' })
    .click();

  await expect(dialog.getByText(`${username} was added to the group.`)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

async function deleteGroupViaApi(page: import('@playwright/test').Page, groupId: string) {
  const res = await page.request.delete(`/api/groups/${encodeURIComponent(groupId)}`);
  expect([204, 404], `DELETE /api/groups/${groupId}`).toContain(res.status());
}

function memberRow(page: import('@playwright/test').Page, username: string) {
  // the current user is filtered out of the list, so this is always the other one
  return page.locator('.SidebarFriend').filter({ hasText: username });
}

test.describe('Groups - roles and ownership', () => {
  test('owner promotes a member to admin and revokes it again', async ({ loggedInPage }) => {
    const bob = seedUser('bob');
    const name = `E2E Roles ${Date.now()}`;
    const groupId = await createGroupViaUi(loggedInPage, name);
    await addMemberViaDialog(loggedInPage, name, bob.username);

    await loggedInPage.getByRole('button', { name: /^Members$/ }).click();
    await expect(memberRow(loggedInPage, bob.username)).toBeVisible();

    await loggedInPage.getByRole('button', { name: `Actions for ${bob.username}` }).click();
    await loggedInPage.getByRole('menuitem', { name: 'Make admin' }).click();
    await expect(memberRow(loggedInPage, bob.username).getByText('admin')).toBeVisible();

    await loggedInPage.getByRole('button', { name: `Actions for ${bob.username}` }).click();
    await loggedInPage.getByRole('menuitem', { name: 'Revoke admin' }).click();
    await expect(memberRow(loggedInPage, bob.username).getByText('admin')).toHaveCount(0);

    await deleteGroupViaApi(loggedInPage, groupId);
  });

  test('handing over ownership leaves the previous owner an admin', async ({
    loggedInPage,
    timPage,
  }) => {
    const tim = seedUser('tim');
    const name = `E2E Handoff ${Date.now()}`;
    const groupId = await createGroupViaUi(loggedInPage, name);
    await addMemberViaDialog(loggedInPage, name, tim.username);

    await loggedInPage.getByRole('button', { name: /^Members$/ }).click();
    await loggedInPage.getByRole('button', { name: `Actions for ${tim.username}` }).click();
    await loggedInPage.getByRole('menuitem', { name: 'Make owner' }).click();

    const confirm = loggedInPage.locator('.ConfirmWindow');
    await expect(confirm).toBeVisible();
    await expect(confirm.getByText('Make tim the owner?')).toBeVisible();
    const [patched] = await Promise.all([
      loggedInPage.waitForResponse(
        (r) => r.url().includes('/members/') && r.request().method() === 'PATCH',
      ),
      confirm.getByRole('button', { name: 'Make owner' }).click(),
    ]);
    expect(patched.status()).toBe(200);

    // alice is now ADMIN: canAdminGroup still holds, canOwnGroup does not
    await loggedInPage.getByRole('button', { name: /^Groups$/ }).click();
	const handoffActions = loggedInPage.getByRole('button', { name: `Actions for ${name}` });
	if (!(await handoffActions.isVisible()))
		loggedInPage.getByRole('button', { name: /^Groups$/ }).click();
    await handoffActions.click();
    const menu = loggedInPage.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: 'Add member' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Leave group' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Rename group' })).toHaveCount(0);
    await expect(menu.getByRole('menuitem', { name: 'Delete group' })).toHaveCount(0);

    // tim owns it now, so he is the one who can delete it
    await deleteGroupViaApi(timPage, groupId);
  });

  test('leaving the group explains how the next owner is chosen', async ({ loggedInPage }) => {
    const tim = seedUser('tim');
    const name = `E2E Leave ${Date.now()}`;
    const groupId = await createGroupViaUi(loggedInPage, name);
    await addMemberViaDialog(loggedInPage, name, tim.username);

    await loggedInPage.getByRole('button', { name: `Actions for ${name}` }).click();
    await loggedInPage.getByRole('menuitem', { name: 'Leave group' }).click();

    const confirm = loggedInPage.locator('.ConfirmWindow');
    await expect(confirm).toBeVisible();
    await expect(
      confirm.getByText('To choose the next owner, use Make owner in the members list first.'),
    ).toBeVisible();

    // cancelled, so nothing changed
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(
      loggedInPage.getByRole('button', { name, exact: true }),
    ).toBeVisible();

    await deleteGroupViaApi(loggedInPage, groupId);
  });

  test('an admin cannot promote, and a plain member only gets Leave', async ({
    loggedInPage,
    bobPage,
    timPage,
  }) => {
    const bob = seedUser('bob');
    const tim = seedUser('tim');
    const name = `E2E Limits ${Date.now()}`;
    const groupId = await createGroupViaUi(loggedInPage, name);
    await addMemberViaDialog(loggedInPage, name, bob.username);
    await addMemberViaDialog(loggedInPage, name, tim.username);

    // promote bob so he is ADMIN, not OWNER
    await loggedInPage.getByRole('button', { name: /^Members$/ }).click();
    await loggedInPage.getByRole('button', { name: `Actions for ${bob.username}` }).click();
    await loggedInPage.getByRole('menuitem', { name: 'Make admin' }).click();
	await expect(memberRow(loggedInPage, bob.username).getByText('admin')).toBeVisible();
    await loggedInPage.keyboard.press('Escape');

    // an admin may add members but not promote or delete the group
    await bobPage.goto('/dashboard');
    await bobPage.waitForLoadState('networkidle');
    await bobPage.getByRole('button', { name: /^Groups$/ }).click();
	const bobHandoffActions = bobPage.getByRole('button', { name: `Actions for ${name}` });
	if (!(await bobHandoffActions.isVisible()))
		bobPage.getByRole('button', { name: /^Groups$/ }).click();
    await bobHandoffActions.click();
    const adminMenu = bobPage.getByRole('menu');
    await expect(adminMenu.getByRole('menuitem', { name: 'Add member' })).toBeVisible();
    await expect(adminMenu.getByRole('menuitem', { name: 'Leave group' })).toBeVisible();
    await expect(adminMenu.getByRole('menuitem', { name: 'Rename group' })).toHaveCount(0);
    await expect(adminMenu.getByRole('menuitem', { name: 'Delete group' })).toHaveCount(0);

    // a plain member gets exactly one item
    await timPage.goto('/dashboard');
    await timPage.waitForLoadState('networkidle');
    await timPage.getByRole('button', { name: /^Groups$/ }).click();
    const timHandoffActions = timPage.getByRole('button', { name: `Actions for ${name}` });
	if (!(await timHandoffActions.isVisible()))
		timPage.getByRole('button', { name: /^Groups$/ }).click();
    await timHandoffActions.click();	
    await expect(timPage.getByRole('menu').getByRole('menuitem')).toHaveCount(1);
    await expect(
      timPage.getByRole('menu').getByRole('menuitem', { name: 'Leave group' }),
    ).toBeVisible();

    await deleteGroupViaApi(loggedInPage, groupId);
  });
});
