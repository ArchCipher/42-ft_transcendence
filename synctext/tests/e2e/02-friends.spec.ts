import { test, expect } from './fixtures/auth';
import { seedUser } from './utils/seed-users';
import { ROUTES } from './utils/test-helpers';

/*
UI map (read from source):
  accordion trigger "Friends"                      DashboardSidebar.tsx:357
  "Add friend" opens the manager dialog             DashboardSidebar.tsx:362
  label "Invite by username or email"              FriendsManagerDialog.tsx:60
  submit "Send request"                            FriendsManagerDialog.tsx:73
  row actions "Accept" / "Decline" / "Cancel request" / "Remove"
  feedback line: success -> role="status", error -> role="alert"
                                                   ManagerDialog.tsx:58
  the three lists are <section aria-labelledby="...">, so row assertions are
  scoped to a section: a bare getByText('bob') also matches the feedback line
  POST 201, PATCH 200, DELETE 204

Seed relationships: friends are bob<->alice and alice<->tim, so bob<->zaphod is
the free pair.

Why ensurePairIsFree() exists: the fixtures close their contexts after each
test but the friendship rows stay in the database, so one interrupted run
poisons every later run. Worse, a DECLINED row is invisible - GET /api/friends
filters to status in [ACCEPTED, PENDING] (route.ts:24) and DELETE matches only
ACCEPTED or a PENDING row this user requested (route.ts:255-262) - yet POST
refuses to overwrite it with 400 "You cannot send another friend request to this
user" (route.ts:140). The only way back through the API is for the *other* side
to send a request, which flips the row to PENDING (route.ts:142-158). So the
probe below does exactly that instead of asking you to run SQL by hand.
*/

type FriendUser = { id: string; username: string };
type FriendLists = {
  friends: FriendUser[];
  incomingRequests: FriendUser[];
  outgoingRequests: FriendUser[];
};
type Api = { status: number; error: string | undefined };

const SECTIONS = {
  incoming: 'section[aria-labelledby="incoming-requests-heading"]',
  sent: 'section[aria-labelledby="sent-requests-heading"]',
  friends: 'section[aria-labelledby="your-friends-heading"]',
} as const;

// --- state helpers, all through page.request, which shares the context's
// --- cookies and baseURL with the page.
async function lists(page: import('@playwright/test').Page): Promise<FriendLists> {
  const res = await page.request.get('/api/friends');
  expect(res.status(), 'GET /api/friends').toBe(200);
  return (await res.json()) as FriendLists;
}

async function postRequest(
  page: import('@playwright/test').Page,
  identifier: string,
): Promise<Api> {
  const res = await page.request.post('/api/friends', { data: { identifier } });
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return { status: res.status(), error: body?.error };
}

async function removeRow(page: import('@playwright/test').Page, userId: string) {
  return (await page.request.delete('/api/friends', { data: { userId } })).status();
}

async function declineRow(page: import('@playwright/test').Page, userId: string) {
  return (
    await page.request.patch('/api/friends', { data: { userId, action: 'decline' } })
  ).status();
}

async function idOf(page: import('@playwright/test').Page, username: string) {
  const data = await lists(page);
  const entry = [...data.friends, ...data.outgoingRequests, ...data.incomingRequests].find(
    (u) => u.username === username,
  );
  if (!entry) throw new Error(`${username} has no friendship row to act on`);
  return entry.id;
}

async function ensurePairIsFree(
  bobPage: import('@playwright/test').Page,
  zaphodPage: import('@playwright/test').Page,
) {
  // 1. clear whatever the API can see, in both directions
  for (const [page, other] of [
    [bobPage, 'zaphod'],
    [zaphodPage, 'bob'],
  ] as const) {
    const data = await lists(page);
    const removable =
      data.friends.find((u) => u.username === other) ??
      data.outgoingRequests.find((u) => u.username === other);
    if (removable) expect(await removeRow(page, removable.id), `DELETE ${other}`).toBe(204);
    const incoming = data.incomingRequests.find((u) => u.username === other);
    if (incoming) expect(await declineRow(page, incoming.id), `decline ${other}`).toBe(200);
  }

  // 2. probe for the invisible DECLINED residue
  const probe = await postRequest(bobPage, 'zaphod');
  if (probe.status === 400 && /another friend request/i.test(probe.error ?? '')) {
    // zaphod sending flips the DECLINED row back to PENDING, then cancels it
    const flipped = await postRequest(zaphodPage, 'bob');
    expect(flipped.status, `flip DECLINED row: ${flipped.error ?? ''}`).toBe(201);
    expect(await removeRow(zaphodPage, await idOf(zaphodPage, 'bob'))).toBe(204);
  } else if (probe.status === 201) {
    // the probe itself created a row; take it back out
    expect(await removeRow(bobPage, await idOf(bobPage, 'zaphod'))).toBe(204);
  } else {
    throw new Error(
      `bob -> zaphod probe returned ${probe.status}: ${probe.error ?? 'no message'}`,
    );
  }
}

async function openFriendsDialog(page: import('@playwright/test').Page) {
  await page.goto(ROUTES.dashboard);
  await page.waitForLoadState('networkidle');
  const addButton = page.getByRole('button', { name: /add friend/i });
  if (!(await addButton.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /^Friends/ }).first().click();
  }
  await addButton.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

// Drives the real form; the API helpers above are only for arranging state.
async function sendRequest(page: import('@playwright/test').Page, identifier: string) {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/invite by username or email/i).fill(identifier);
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/friends') && r.request().method() === 'POST',
    ),
    dialog.getByRole('button', { name: /send request/i }).click(),
  ]);
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return { status: response.status(), error: body?.error };
}

function expectStatus(result: Api, expected: number, context: string) {
  expect(result.status, `${context} -> ${result.status} ${result.error ?? ''}`).toBe(
    expected,
  );
}

test.describe('Friends', () => {
  test.beforeEach(async ({ bobPage, zaphodPage }) => {
    await ensurePairIsFree(bobPage, zaphodPage);
  });

  test.afterEach(async ({ bobPage, zaphodPage }) => {
    await ensurePairIsFree(bobPage, zaphodPage);
  });

  test('sends, accepts, then removes a friend request', async ({ bobPage, zaphodPage }) => {
    test.setTimeout(90_000); // 3 dialog opens + 3 mutating round trips; the 30s default can't cover it
    const zaphod = seedUser('zaphod');

    // 1. bob sends a request by username
    await openFriendsDialog(bobPage);
    expectStatus(await sendRequest(bobPage, zaphod.username), 201, 'bob -> zaphod');
    await expect(bobPage.getByRole('status')).toHaveText('Friend request sent.');
    await expect(bobPage.locator(SECTIONS.sent)).toContainText(zaphod.username);

    // 2. zaphod sees it as incoming and accepts
    await openFriendsDialog(zaphodPage);
    await expect(zaphodPage.locator(SECTIONS.incoming)).toContainText('bob');
    const [accept] = await Promise.all([
      zaphodPage.waitForResponse(
        (r) => r.url().includes('/api/friends') && r.request().method() === 'PATCH',
      ),
      zaphodPage.getByRole('button', { name: /^Accept$/ }).click(),
    ]);
    expect(accept.status(), 'accept').toBe(200);
    await expect(zaphodPage.getByRole('status')).toHaveText('You are now friends with bob.');
    await expect(zaphodPage.locator(SECTIONS.friends)).toContainText('bob');

    // 3. cleanup: bob removes zaphod again so the seed is unchanged
    await openFriendsDialog(bobPage);
	const zaphodRow = bobPage.locator(SECTIONS.friends).locator('li', {hasText: zaphod.username});
	await zaphodRow.getByRole('button', { name: /^Remove$/ }).click();
    const [remove] = await Promise.all([
      bobPage.waitForResponse(
        (r) => r.url().includes('/api/friends') && r.request().method() === 'DELETE',
      ),
      bobPage.getByRole('button', { name: 'Remove friend' }).click(),
    ]);
    expect(remove.status(), 'remove').toBe(204);
  });

  test('cancels an outgoing friend request', async ({ bobPage }) => {
    await openFriendsDialog(bobPage);
    expectStatus(
      await sendRequest(bobPage, seedUser('zaphod').username),
      201,
      'bob -> zaphod',
    );

    const [cancel] = await Promise.all([
      bobPage.waitForResponse(
        (r) => r.url().includes('/api/friends') && r.request().method() === 'DELETE',
      ),
      bobPage.getByRole('button', { name: /cancel request/i }).first().click(),
    ]);
    expect(cancel.status(), 'cancel').toBe(204);
    await expect(bobPage.getByRole('status')).toHaveText('Friend request cancelled.');
    await expect(bobPage.getByText('No sent requests.')).toBeVisible();
  });

  test('declines an incoming friend request', async ({ bobPage, zaphodPage }) => {
    await openFriendsDialog(bobPage);
    expectStatus(
      await sendRequest(bobPage, seedUser('zaphod').username),
      201,
      'bob -> zaphod',
    );

    await openFriendsDialog(zaphodPage);
    const [decline] = await Promise.all([
      zaphodPage.waitForResponse(
        (r) => r.url().includes('/api/friends') && r.request().method() === 'PATCH',
      ),
      zaphodPage.getByRole('button', { name: /^Decline$/ }).click(),
    ]);
    expect(decline.status(), 'decline').toBe(200);
    await expect(zaphodPage.getByRole('status')).toHaveText('Friend request declined.');
    await expect(zaphodPage.getByText('No requests waiting for you.')).toBeVisible();
  });

  test('rejects a friend request to yourself', async ({ bobPage }) => {
    await openFriendsDialog(bobPage);
    expectStatus(await sendRequest(bobPage, 'bob'), 400, 'bob -> bob');
    // error feedback is role="alert", not role="status" (ManagerDialog.tsx:58)
    await expect(bobPage.getByRole('alert')).toHaveText(
      'You cannot send a friend request to yourself',
    );
    await expect(bobPage.getByText('No sent requests.')).toBeVisible();
  });

  test('rejects a friend request to an unknown identifier', async ({ bobPage }) => {
    await openFriendsDialog(bobPage);
    // notFound('User') -> 'User not found', 404 (lib/api/responses.ts:11)
    expectStatus(await sendRequest(bobPage, 'nobody_here_12345'), 404, 'bob -> nobody');
    await expect(bobPage.getByRole('alert')).toHaveText('User not found');
  });

  test('rejects a second request while one is pending', async ({ bobPage }) => {
    await openFriendsDialog(bobPage);
    expectStatus(
      await sendRequest(bobPage, seedUser('zaphod').username),
      201,
      'bob -> zaphod',
    );

    await openFriendsDialog(bobPage);
    expectStatus(
      await sendRequest(bobPage, seedUser('zaphod').username),
      400,
      'bob -> zaphod again',
    );
    await expect(bobPage.getByRole('alert')).toHaveText('Friend request already sent');
  });
});
