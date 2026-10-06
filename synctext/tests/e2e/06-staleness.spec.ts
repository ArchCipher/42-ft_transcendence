import { test, expect } from './fixtures/auth';
import { seedUser } from './utils/seed-users';

/*
What is actually being tested: a page rendered while the caller was a member must
stop working once the membership or the group is gone, and the answer must not
leak whether the group exists (lib/permissions.ts resolves non-members to null
and the routes answer 404, not 403).

Contract points used here:
  POST   /api/groups                     -> 201 { id, ... }
  POST   /api/groups/:id/members         -> 201, 404 "Friend" for a non-friend
  DELETE /api/groups/:id/members/:userId -> 204
  DELETE /api/groups/:id                 -> 204 (owner only)
  POST   /api/documents { groupId }      -> 404 "Group" once the caller is out
  GET    /api/groups                     -> no longer lists it

Setup uses the API on purpose: the member-adding *UI* is covered in
05-groups-advanced.spec.ts, and here the interesting moment is what the API and
the already-loaded page answer afterwards.

No registrations: alice owns the throwaway groups and deletes each one.
*/

async function createGroupViaApi(page: import('@playwright/test').Page, name: string) {
  const res = await page.request.post('/api/groups', { data: { name } });
  expect(res.status(), `POST /api/groups: ${await res.text()}`).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

// A group member's user id, taken from the caller's own friend list.
async function friendId(page: import('@playwright/test').Page, username: string) {
  const res = await page.request.get('/api/friends');
  expect(res.status()).toBe(200);
  const data = (await res.json()) as {
    friends: { id: string; username: string }[];
  };
  const friend = data.friends.find((u) => u.username === username);
  if (!friend) throw new Error(`${username} is not a friend of the caller`);
  return friend.id;
}

async function groupNames(page: import('@playwright/test').Page) {
  const res = await page.request.get('/api/groups');
  expect(res.status()).toBe(200);
  return ((await res.json()) as { name: string }[]).map((g) => g.name);
}

test.describe('Staleness & reconciliation', () => {
  test('a removed member loses the group at once', async ({ loggedInPage, timPage }) => {
    const tim = seedUser('tim');
    const name = `E2E Removed ${Date.now()}`;
    const groupId = await createGroupViaApi(loggedInPage, name);

    // alice and tim are seeded friends, so the membership is a normal one
    const added = await loggedInPage.request.post(`/api/groups/${groupId}/members`, {
      data: { userId: await friendId(loggedInPage, tim.username) },
    });
    expect(added.status(), `add ${tim.username}: ${await added.text()}`).toBe(201);
    expect(await groupNames(timPage)).toContain(name);

    // tim loads the dashboard while he is still a member, so the page he is
    // looking at is the stale one
    await timPage.goto('/dashboard');
    await timPage.waitForLoadState('networkidle');
    await timPage.getByRole('button', { name, exact: true }).click();
    await expect(timPage.getByRole('button', { name, exact: true })).toBeVisible();

    const removed = await loggedInPage.request.delete(
      `/api/groups/${groupId}/members/${await friendId(loggedInPage, tim.username)}`,
    );
    expect(removed.status(), `remove ${tim.username}`).toBe(204);

    // the API no longer admits the group exists
    const create = await timPage.request.post('/api/documents', { data: { groupId } });
    expect(create.status()).toBe(404);
    expect(await create.json()).toEqual({ error: 'Group not found' });
    expect(await groupNames(timPage)).not.toContain(name);

    // and the stale page cannot keep offering it
    await timPage.reload();
    await expect(timPage.getByRole('button', { name, exact: true })).toHaveCount(0);

    await loggedInPage.request.delete(`/api/groups/${groupId}`);
  });

  test('a deleted group is gone for a member holding its id', async ({
    loggedInPage,
    timPage,
  }) => {
    const tim = seedUser('tim');
    const name = `E2E Deleted ${Date.now()}`;
    const groupId = await createGroupViaApi(loggedInPage, name);

    const added = await loggedInPage.request.post(`/api/groups/${groupId}/members`, {
      data: { userId: await friendId(loggedInPage, tim.username) },
    });
    expect(added.status()).toBe(201);

    // tim is online and holding the id before it disappears
    await timPage.goto('/dashboard');
    await timPage.waitForLoadState('networkidle');
    expect(await groupNames(timPage)).toContain(name);

    const deleted = await loggedInPage.request.delete(`/api/groups/${groupId}`);
    expect(deleted.status()).toBe(204);

    expect(await groupNames(timPage)).not.toContain(name);
    const create = await timPage.request.post('/api/documents', { data: { groupId } });
    expect(create.status()).toBe(404);
    expect(await create.json()).toEqual({ error: 'Group not found' });

    await timPage.reload();
    await expect(timPage.getByRole('button', { name, exact: true })).toHaveCount(0);
  });

  test('an outsider is told nothing about a group', async ({ loggedInPage, zaphodPage }) => {
    const name = `E2E Outsider ${Date.now()}`;
    const groupId = await createGroupViaApi(loggedInPage, name);

    // zaphod is in no group and is not one of alice's friends
    expect(await groupNames(zaphodPage)).not.toContain(name);

    const create = await zaphodPage.request.post('/api/documents', { data: { groupId } });
    expect(create.status()).toBe(404);
    // 404, not 403: a non-member must not learn that the group exists
    expect(await create.json()).toEqual({ error: 'Group not found' });

    // /api/groups/[id] only implements PATCH and DELETE, so there is no read to
    // probe; the group list above and the document create are the real answers
    await loggedInPage.request.delete(`/api/groups/${groupId}`);
  });
});
