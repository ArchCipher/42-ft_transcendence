import { test, expect } from './fixtures/auth';
import { gotoDashboard, startDocRename } from './utils/test-helpers';

/*
Edge cases around the two inline editors. Every selector here was read off the
source rather than guessed:

  card rename input   .DocumentTitleInput, maxLength 50, no aria-label, saves on
                      blur (Enter blurs, Escape cancels), keeps focus when the
                      save is rejected            DocumentsDashboard.tsx:252-292
  card errors         "Please enter a document title"
                      "A document with this title already exists"  (compared
                      case-insensitively)         DocumentsDashboard.tsx:93,99
  group name field    <label for="group-name"> so getByLabel('Group name'), and
                      maxLength 120 on the input  GroupNameDialog.tsx:44-51
  group submit        "Create" for a new group, "Rename" for an existing one,
                      disabled while name.trim() is empty
                                                   GroupNameDialog.tsx:53,
                                                   DashboardSidebar.tsx:410

Cleanup rule: each test deletes every document it made over the API, so a failed
assertion cannot leak state into the next spec. No user is registered here.
*/


async function createPrivateDocument(page: import('@playwright/test').Page) {
  await gotoDashboard(page);
  const [created] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/documents') && r.request().method() === 'POST',
    ),
    page.getByRole('button', { name: /create document/i }).click(),
  ]);
  expect(created.status()).toBe(201);
  await page.waitForURL(/\/doc\//);
  return page.url().split('/doc/')[1];
}

/*
Same two-part guard as 04-documents.spec.ts: cleanup used to be the last
statement, so a failing assertion leaked the document, and the leaked card then
made `Actions for Untitled Document` ambiguous for the next test. A single run
reached 7 untitled documents that way. Unique titles mean a leaked card can never
break a later locator, and the finally means it is usually not leaked at all.
*/
let docCounter = 0;
function uniqueTitle(prefix: string) {
  docCounter += 1;
  return `${prefix}-${process.pid}-${docCounter}`;
}

async function bestEffortDelete(page: import('@playwright/test').Page, id: string) {
  await page.request.delete(`/api/documents/${encodeURIComponent(id)}`).catch(() => {});
}

/** Creates a document, then titles it uniquely so no card locator can collide. */
async function createTitledDocument(page: import('@playwright/test').Page, prefix: string) {
  const id = await createPrivateDocument(page);
  const title = uniqueTitle(prefix);
  const renamed = await page.request.patch(`/api/documents/${encodeURIComponent(id)}`, {
    data: { title },
  });
  expect([200, 204], `PATCH title of ${id}`).toContain(renamed.status());
  return { id, title };
}

/* Opens the sidebar's New group dialog and returns its name field. */
async function openNewGroupDialog(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /new group/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return { dialog, input: dialog.getByLabel('Group name') };
}

test.describe('Edge cases', () => {
  test('rejects an empty title on card rename', async ({ loggedInPage }) => {
    const { id, title } = await createTitledDocument(loggedInPage, 'blankrename');
    await gotoDashboard(loggedInPage);

    try {
      await loggedInPage.getByRole('button', { name: `Actions for ${title}` }).click();
      await loggedInPage.getByRole('menuitem', { name: 'Rename' }).click();

      const input = loggedInPage.locator('.DocumentTitleInput');
      await expect(input).toBeFocused();
      await input.fill('   '); // whitespace is trimmed server-side, so it is empty
      await input.blur();

      await expect(loggedInPage.getByText('Please enter a document title')).toBeVisible();
      // the rejected edit is rolled back and focus is handed back for a retype
      await expect(input).toBeFocused();
      await expect(
        loggedInPage.getByRole('button', { name: `Actions for ${title}` }),
      ).toBeVisible();
    } finally {
      await bestEffortDelete(loggedInPage, id);
    }
  });

  test('rejects a duplicate title case-insensitively', async ({ loggedInPage }) => {
    // the first document takes the shared title, the second differs only in case
    const shared = uniqueTitle('e2e alpha');
    const idA = await createPrivateDocument(loggedInPage);
    const input = await startDocRename(loggedInPage);
    await input.fill(shared);
    await loggedInPage.getByLabel('Save document title').click();
    await expect(loggedInPage.getByRole('button', { name: shared })).toBeVisible({timeout: 20_000});

    const { id: idB, title: second } = await createTitledDocument(loggedInPage, 'dupsecond');
    await gotoDashboard(loggedInPage);

    try {
      await loggedInPage.getByRole('button', { name: `Actions for ${second}` }).click();
      await loggedInPage.getByRole('menuitem', { name: 'Rename' }).click();
      const card = loggedInPage.locator('.DocumentTitleInput');
      await card.fill(shared.toLowerCase()); // differs only in case
      await card.blur();

      await expect(
        loggedInPage.getByText('A document with this title already exists'),
      ).toBeVisible();
      await expect(
        loggedInPage.getByRole('button', { name: `Actions for ${second}` }),
      ).toBeVisible();
    } finally {
      await bestEffortDelete(loggedInPage, idA);
      await bestEffortDelete(loggedInPage, idB);
    }
  });

  test('caps the card rename input at 50 characters', async ({ loggedInPage }) => {
    const { id, title } = await createTitledDocument(loggedInPage, 'capedge');
    await gotoDashboard(loggedInPage);

    try {
      await loggedInPage.getByRole('button', { name: `Actions for ${title}` }).click();
      await loggedInPage.getByRole('menuitem', { name: 'Rename' }).click();

      const card = loggedInPage.locator('.DocumentTitleInput');
      await card.fill('x'.repeat(60));
      // maxLength is 50 on the card input; the doc page input allows 120
      await expect(card).toHaveValue('x'.repeat(50));

      await card.blur();
    } finally {
      await bestEffortDelete(loggedInPage, id);
    }
  });

  test('caps the group name at 120 characters and blocks a blank one', async ({
    loggedInPage,
  }) => {
    await gotoDashboard(loggedInPage);
    const { dialog, input } = await openNewGroupDialog(loggedInPage);
    const submit = dialog.getByRole('button', { name: 'Create', exact: true });

    await input.fill('g'.repeat(140));
    await expect(input).toHaveValue('g'.repeat(120));

    // trim() gates the submit button, so padding never creates a nameless group
    await input.fill('    ');
    await expect(submit).toBeDisabled();

    await input.fill('E2E Group ' + 'g'.repeat(110)); // 121 chars: still too long
    await expect(input).toHaveValue('E2E Group ' + 'g'.repeat(110));

    // Dismiss without creating anything. ManagerDialog renders no Cancel button
    // (only DialogContent showCloseButton), so Escape is the way out - Radix
    // Dialog treats it as onOpenChange(false), which the sidebar maps to
    // setNameDialog(null).
    await loggedInPage.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    const groups = (await (await loggedInPage.request.get('/api/groups')).json()) as {
      name: string;
    }[];
    expect(groups.some((g) => g.name.includes('E2E Group'))).toBe(false);
  });

  test('the API rejects an over-long or blank group name', async ({ loggedInPage }) => {
    // the UI prevents both, so the server contract is asserted directly
    const tooLong = await loggedInPage.request.post('/api/groups', {
      data: { name: 'x'.repeat(121) },
    });
    expect(tooLong.status()).toBe(400);

    const blank = await loggedInPage.request.post('/api/groups', { data: { name: '   ' } });
    expect(blank.status()).toBe(400);

    // nothing was created by either rejection
    const groups = (await (await loggedInPage.request.get('/api/groups')).json()) as {
      name: string;
    }[];
    expect(groups.some((g) => g.name === 'x'.repeat(121) || g.name.trim() === '')).toBe(false);
  });
});
