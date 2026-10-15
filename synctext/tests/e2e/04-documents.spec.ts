import { test, expect } from './fixtures/auth';
import { gotoDashboard, gotoDocument, startDocRename } from './utils/test-helpers';

/*
UI map (read from source):
  create tile      aria-label="Create document"      DocumentsDashboard.tsx:135
                   (flips to "Creating document" while in flight)
  card             .DocumentCard, with an ActionMenu labelled
                   "Actions for <title>"             DocumentsDashboard.tsx:241
  card open button aria-label="Open <title>"         DocumentsDashboard.tsx:246
  card rename      inline input .DocumentTitleInput, maxLength 50, saved on
                   blur/Enter, Escape cancels        DocumentsDashboard.tsx:256
  card errors      "Please enter a document title" / "A document with this title
                   already exists"                   DocumentsDashboard.tsx:93,99
  delete confirm   .ConfirmWindow, buttons Cancel/Delete
  doc page         title is a BUTTON (title="Rename document"); only after
                   clicking it does aria-label="Document title" exist, and the
                   save button is aria-label="Save document title"
                                                   app/doc/[id]/document-title.tsx:45-78

Rules under test (lib/permissions.ts):
  canEdit = group OWNER or a grant row; the creator is granted automatically
  POST /api/documents   -> 201, or 404 "Group" when not a member
  PATCH/DELETE document -> 403 when !canEdit, DELETE -> 204 otherwise

No test here registers a user: every document is created by a seeded account and
deleted again, so the signup quota stays with 01-auth.spec.ts.
*/

const SEEDED_GROUP = 'synctext';
const UNTITLED = 'Untitled Document';

/*
Every document created here is titled uniquely and cleaned up in a finally.

Both halves matter. Cleanup used to be the last statement of each test, so any
earlier assertion failure leaked the document; and the cards were then located by
title, so `Actions for Untitled Document` went ambiguous the moment two untitled
documents existed. One failure became five: a single run went 2 -> 3 -> 4 -> 5 -> 7
untitled documents, one leak per failing test.

Unique titles make the locator incapable of ambiguity even when a cleanup cannot
run (a crashed browser cannot execute a finally), and the finally stops the leak
in the normal case. Together neither failure can cascade.
*/
let docCounter = 0;
function uniqueTitle(prefix: string) {
  docCounter += 1;
  return `${prefix}-${process.pid}-${docCounter}`;
}

/** Cleanup that must never mask the real assertion failure. */
async function bestEffortDelete(page: import('@playwright/test').Page, id: string) {
  await page.request.delete(`/api/documents/${encodeURIComponent(id)}`).catch(() => {});
}

async function groupIdOf(page: import('@playwright/test').Page, name: string) {
  const res = await page.request.get('/api/groups');
  expect(res.status(), 'GET /api/groups').toBe(200);
  const groups = (await res.json()) as { id: string; name: string }[];
  const group = groups.find((g) => g.name === name);
  if (!group) throw new Error(`seeded group ${name} not found`);
  return group.id;
}

// Creates through the real tile and returns the new document id from the URL.
async function createPrivateDocument(page: import('@playwright/test').Page) {
  await gotoDashboard(page);
  const [created] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/documents') && r.request().method() === 'POST',
    ),
    page.getByRole('button', { name: /create document/i }).click(),
  ]);
  expect(created.status(), `POST /api/documents: ${await created.text()}`).toBe(201);
  await page.waitForURL(/\/doc\//);
  return page.url().split('/doc/')[1];
}

/** Creates a document, then titles it uniquely so no card locator can collide. */
async function createTitledDocument(page: import('@playwright/test').Page, prefix: string) {
  const id = await createPrivateDocument(page);
  const title = uniqueTitle(prefix);
  const renamed = await page.request.patch(`/api/documents/${encodeURIComponent(id)}`, {
    data: { title },
  });
  expect([200, 204], `PATCH title of ${id}: ${await renamed.text()}`).toContain(renamed.status());
  return { id, title };
}

test.describe('Documents', () => {
  test('creates a document in the private space', async ({ loggedInPage }) => {
    // count rather than match: this test is about the DEFAULT title, so it cannot
    // use a unique one. Asserting the count grew proves a new untitled card
    // appeared without depending on there being only one.
    await gotoDashboard(loggedInPage);
    const untitledCards = loggedInPage.getByRole('button', { name: `Actions for ${UNTITLED}` });
    const before = await untitledCards.count();

    const id = await createPrivateDocument(loggedInPage);

    try {
      // POST /api/documents without a groupId picks the caller's private space.
      // The title arrives as a read-state BUTTON - there is no input until it is
      // clicked - so assert the button, and its "Rename document" title proves
      // alice may rename what she just created.
      await gotoDashboard(loggedInPage);
      await expect(untitledCards).toHaveCount(before + 1);
	  await expect(loggedInPage.getByRole('button', {name: UNTITLED, exact: true})).toBeVisible();
    } finally {
      await bestEffortDelete(loggedInPage, id);
    }
  });

  test('renames a document from the document page', async ({ loggedInPage }) => {
    test.setTimeout(90_000); // doc page opens a collab websocket; first connection is slow
    const { id, title } = await createTitledDocument(loggedInPage, 'renamed');

    try {
      // the input only exists once the title button is clicked
      const input = await startDocRename(loggedInPage);
      await input.fill(title);
      await loggedInPage.getByLabel('Save document title').click();

      // back in read state: a button carrying the new title
      await expect(loggedInPage.getByRole('button', { name: title })).toBeVisible({timeout: 20_000});
      await expect(loggedInPage.getByTitle('Rename document')).toBeVisible();
    } finally {
      await bestEffortDelete(loggedInPage, id);
    }
  });

  test('deletes a document from the card menu', async ({ loggedInPage }) => {
    const { id, title } = await createTitledDocument(loggedInPage, 'deleteme');
    await gotoDashboard(loggedInPage);

    try {
      await loggedInPage.getByRole('button', { name: `Actions for ${title}` }).click();
      await loggedInPage.getByRole('menuitem', { name: 'Delete' }).click();

      const confirm = loggedInPage.locator('.ConfirmWindow');
      await expect(confirm).toBeVisible();
      const [deleted] = await Promise.all([
        loggedInPage.waitForResponse(
          (r) => r.url().includes('/api/documents') && r.request().method() === 'DELETE',
        ),
        confirm.getByRole('button', { name: 'Delete' }).click(),
      ]);
      expect(deleted.status()).toBe(204);

      await expect(
        loggedInPage.getByRole('button', { name: `Actions for ${title}` }),
      ).toHaveCount(0);
    } finally {
      // normally already gone; harmless if the UI delete succeeded
      await bestEffortDelete(loggedInPage, id);
    }
  });

  test('rejects an empty title from the card menu', async ({ loggedInPage }) => {
    const { id, title } = await createTitledDocument(loggedInPage, 'emptyrename');
    await gotoDashboard(loggedInPage);

    try {
      await loggedInPage.getByRole('button', { name: `Actions for ${title}` }).click();
      await loggedInPage.getByRole('menuitem', { name: 'Rename' }).click();

      // the card input saves on blur, unlike the doc page where the save button is
      // disabled while the title is empty. It has no aria-label, so the class is
      // the only handle on it.
      const input = loggedInPage.locator('.DocumentTitleInput');
      await expect(input).toBeFocused();
      await input.fill('');
      await input.blur();

      await expect(loggedInPage.getByText('Please enter a document title')).toBeVisible();
      // and it keeps focus so the user can retype
      await expect(input).toBeFocused();
      // the title is unchanged
      await expect(
        loggedInPage.getByRole('button', { name: `Actions for ${title}` }),
      ).toBeVisible();
    } finally {
      await bestEffortDelete(loggedInPage, id);
    }
  });

  test('caps the card rename input at 50 characters', async ({ loggedInPage }) => {
    // maxLength lives on the card input (50), not on the doc page input (120)
    const { id, title } = await createTitledDocument(loggedInPage, 'caprename');
    await gotoDashboard(loggedInPage);

    try {
      await loggedInPage.getByRole('button', { name: `Actions for ${title}` }).click();
      await loggedInPage.getByRole('menuitem', { name: 'Rename' }).click();

      const input = loggedInPage.locator('.DocumentTitleInput');
      await input.fill('x'.repeat(60));
      await expect(input).toHaveValue('x'.repeat(50));

      await input.blur();
    } finally {
      await bestEffortDelete(loggedInPage, id);
    }
  });

  test('a member without a grant can read but not rename or delete', async ({
    loggedInPage,
    bobPage,
  }) => {
    // alice owns synctext, so her new document carries the creator grant
    const groupId = await groupIdOf(loggedInPage, SEEDED_GROUP);
    const created = await loggedInPage.request.post('/api/documents', {
      data: { groupId },
    });
    expect(created.status()).toBe(201);
    const document = (await created.json()) as { id: string; title: string };
    const title = uniqueTitle('readonly');
    await loggedInPage.request.patch(`/api/documents/${document.id}`, {
      data: { title },
    });

    try {
      // bob is only ADMIN there and holds no grant, so canEdit is false
      await gotoDashboard(bobPage);
      await bobPage.getByRole('button', { name: SEEDED_GROUP, exact: true }).click();

      await expect(bobPage.getByRole('button', { name: `Open ${title}` })).toBeVisible();
      // documentActions() returns [] when !canEdit, so ActionMenu renders nothing
      await expect(
        bobPage.getByRole('button', { name: `Actions for ${title}` }),
      ).toHaveCount(0);

      // the doc page still opens, and it opens read-only: the title button carries
      // the readOnlyHint instead of "Rename document", so no input can appear
      await gotoDocument(bobPage, document.id);
      await expect(bobPage.getByRole('button', { name: title })).toBeVisible();
      await expect(bobPage.getByLabel('Document title', {exact: true})).toHaveCount(0);

      const patch = await bobPage.request.patch(`/api/documents/${document.id}`, {
        data: { title: 'Bob was here' },
      });
      expect(patch.status()).toBe(403);

      const remove = await bobPage.request.delete(`/api/documents/${document.id}`);
      expect(remove.status()).toBe(403);
    } finally {
      await bestEffortDelete(loggedInPage, document.id);
    }
  });
});
