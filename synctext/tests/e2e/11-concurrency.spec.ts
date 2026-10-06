/*
subject.txt III.2 Multi-user Support (Mandatory):
  - "Multiple users can be logged in and active at the same time."
  - "Concurrent actions by different users are handled properly."
  - "No data corruption or race conditions occur with simultaneous user actions."

How this spec is meant to run: with MORE THAN ONE WORKER, e.g.
    npx playwright test --config playwright.parallel.config.ts
The tests are written to be independent, and each one owns a disjoint set of
accounts so that parallel execution cannot make them interfere:

    zaphod  -> only the session-cap test (it opens 7 sessions on purpose, which
               would revoke any other session of the same user)
    bob/tim -> friend-request race
    alice   -> document grant + realtime convergence, rename race, group race
               (up to 3 sessions, still far below MAX_SESSIONS = 5)

Grounded facts this spec relies on (verify if the app changes):
  - MAX_SESSIONS = 5 (lib/auth/session.ts), enforced in lib/auth/session-create.ts:
    the transaction locks the account row first (tx.user.updateMany - Postgres
    takes the same lock as SELECT ... FOR UPDATE), creates the session, then
    revokes everything beyond the newest MAX_SESSIONS.
  - Friendship rows are keyed by the composite primary key [userAId, userBId]
    with the two ids sorted, so the same pair can only ever exist once.
  - canEdit = group role OWNER, or an explicit per-document grant. In the seeded
    group "synctext": alice = OWNER, bob = ADMIN, tim = MEMBER; admins and
    members are read-only unless granted.
  - Seeded friendships are ACCEPTED for bob<->alice and alice<->tim only, so the
    friend race uses bob<->tim, which start with no relationship.
  - Registration is capped at 5 successful signups per hour per IP, so only ONE
    test here registers a user, and only to prove the unique-email race.

Rounds: the races below repeat inside their own test, SEQUENTIALLY (parallel
rounds on one account would legitimately break the session cap), so a plain
`npx playwright test` hunts for races without --repeat-each.
CONCURRENCY_ROUNDS=1 turns every loop off for a quick run. The unique-email
race deliberately stays at one round: REGISTER_LIMIT allows 5 successful
signups per hour (lib/auth/rate-limit.ts:46-51) and 99-rate-limit.spec.ts
asserts that quota later in this same run.
*/
import { test, expect } from "./fixtures/auth";
import { seedUser } from "./utils/seed-users";
import { loginUserExpectSuccess, waitForDashboardReady, waitForHydrated } from "./utils/test-helpers";

// Keep in sync with MAX_SESSIONS in lib/auth/session.ts.
const MAX_SESSIONS = 5;

const uniq = () => Math.random().toString(36).slice(2, 9);
const editorOf = (page: import("@playwright/test").Page) =>
  page.locator('[contenteditable="true"]').first();

// Rounds per race. CONCURRENCY_ROUNDS=1 (or 0 / non-numeric) falls back to the
// per-test default, which is also what a plain run uses.
const envRounds = (fallback: number) => {
  const raw = Number(process.env.CONCURRENCY_ROUNDS);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : fallback;
};

test.describe("III.2 multi-user support", () => {
  // Deliberately NOT looped: it only proves that independent cookie jars stay
  // independent, which is not a race, and every extra round would mint another
  // session for alice/bob/tim - past 5, the cap starts revoking sessions that
  // other specs are holding. zaphod is absent for the same reason: the
  // session-cap test owns that account.
  test("many clients can be logged in at the same time", async ({ browser }) => {
    test.setTimeout(240_000);

    // 3 independent cookie jars, all signing in as different seeded users.
    const accounts = (["alice", "bob", "tim"] as const).map((name) => seedUser(name));
    const contexts = await Promise.all(
      accounts.map(() => browser.newContext({ ignoreHTTPSErrors: true })),
    );

    try {
      const pages = await Promise.all(contexts.map((c) => c.newPage()));

      // sign in every client at the same time, not one after another
      await Promise.all(
        pages.map(async (page, i) => {
          await page.goto("/auth");
          await loginUserExpectSuccess(page, accounts[i]);
        }),
      );

      // every single client must end up on a working dashboard
      await Promise.all(pages.map((page) => waitForDashboardReady(page)));

      // Each context must hold its OWN live session. GET /api/session answers
      // 200 {signedIn:boolean} and carries no identity at all (app/api/session
      // route.ts:18-28), so asserting the body mentions the account's email was
      // always going to fail. The property that actually matters for III.2 is
      // that no two clients share a session token, which is exactly what breaks
      // if a cookie jar is ever shared or a context inherits another's cookies.
      const tokens: (string | undefined)[] = [];
      const signedIn: boolean[] = [];

      for (const context of contexts) {
        const cookies = await context.cookies();
        tokens.push(cookies.find((cookie) => cookie.name === "session")?.value);
        const status = await (await context.request.get("/api/session")).json();
        signedIn.push(status.signedIn);
      }

      for (const [i, account] of accounts.entries()) {
        expect(tokens[i], `${account.email} has no session cookie`).toBeTruthy();
        expect(signedIn[i], `${account.email} has no live session`).toBe(true);
      }

      expect(
        new Set(tokens).size,
        "two clients shared one session token: a cookie jar leaked between contexts",
      ).toBe(tokens.length);
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });

  test("the session cap holds when the same account logs in concurrently", async ({ playwright }) => {
    const rounds = envRounds(10);
    test.setTimeout(rounds * 10_000 + 30_000);
    const baseURL = test.info().project.use.baseURL as string;
    const account = seedUser("zaphod");

    for (let round = 1; round <= rounds; round++) {
      // 7 parallel logins > MAX_SESSIONS: the cap must still hold afterwards.
      // playwright.request (NOT the `request` fixture) is what can mint extra
      // cookie jars: `request` is an APIRequestContext and has no newContext().
      // Fresh jars per round: a reused jar still carries the previous round's
      // cookie, which would hide what the cap actually revoked.
      const jars = await Promise.all(
        Array.from({ length: 7 }, () =>
          playwright.request.newContext({ baseURL, ignoreHTTPSErrors: true }),
        ),
      );

      try {
        const logins = await Promise.all(
          // only {email, password}: loginSchema is .strict() (lib/auth/validation
          // .ts:72-77), so passing seedUser()'s extra `username` key fails with
          // 400 {"error":"Validation failed","fields":{}} - the error has no field
          // path because zod reports an unknown key at the object root.
          jars.map((jar) =>
            jar.post("/api/auth/login", {
              data: { email: account.email, password: account.password },
            }),
          ),
        );
        for (const [i, login] of logins.entries()) {
          expect(login.status(), `round ${round} login ${i}: ${await login.text()}`).toBe(200);
        }

        // count the sessions that are still alive
        // Liveness must come from the BODY, not the status code:
        // GET /api/session is public and answers 200 { signedIn: false } for a
        // revoked, expired or absent session (app/api/session/route.ts), so
        // counting 200s reports every jar as alive no matter what the app did.
        const liveness = await Promise.all(
          jars.map(async (jar) => {
            const res = await jar.get("/api/session");
            expect(res.status()).toBe(200);
            const body = (await res.json()) as { signedIn: boolean };
            return body.signedIn;
          }),
        );
        const alive = liveness.filter(Boolean).length;

        // If this fails, the session bookkeeping is not atomic: the create +
        // "revoke everything older than MAX_SESSIONS" pair ran under Postgres
        // READ COMMITTED, so concurrent logins each saw too few existing rows
        // and nobody revoked anybody. The fix is the row lock taken at the top
        // of lib/auth/session-create.ts (tx.user.updateMany - Postgres locks the
        // row exactly like SELECT ... FOR UPDATE), which serializes logins for
        // one account while leaving every other account free to proceed.
        expect(
          alive,
          `round ${round}: ${alive} of 7 concurrent logins still had a live session; the cap is ${MAX_SESSIONS}`,
        ).toBeLessThanOrEqual(MAX_SESSIONS);
        expect(alive, `round ${round}`).toBeGreaterThan(0);
      } finally {
        await Promise.all(jars.map((jar) => jar.dispose()));
      }
    }
  });

  // No rounds loop on purpose: REGISTER_LIMIT allows 5 successful signups per
  // hour (rate-limit.ts:46-51), this spec and the ones before it already spend
  // 4 of them, and 99-rate-limit.spec.ts asserts the quota later in the same
  // run. A second round would turn all four requests into 429 and break the
  // counts below.
  test("concurrent signups with the same email create exactly one account", async ({ playwright }) => {
    test.setTimeout(120_000);
    const baseURL = test.info().project.use.baseURL as string;
    const jar = await playwright.request.newContext({ baseURL, ignoreHTTPSErrors: true });

    const email = `race-${uniq()}@test.local`;
    const payload = {
      email,
      username: `race${uniq().replace(/[^a-z0-9]/g, "")}`,
      password: "Correct-Horse-9-Battery",
    };

    try {
      const responses = await Promise.all(
        Array.from({ length: 4 }, () => jar.post("/api/auth/register", { data: payload })),
      );
      const statuses = responses.map((r) => r.status());

      // User.email is UNIQUE, so exactly one insert may win. The others must be
      // rejected as conflicts, never inserted and never a 500.
      expect(statuses.filter((s) => s === 201).length, `statuses: ${statuses.join(",")}`).toBe(1);
      expect(
        statuses.filter((s) => s === 409).length,
        `statuses: ${statuses.join(",")}`,
      ).toBe(3);
      expect(statuses.some((s) => s >= 500)).toBe(false);
    } finally {
      await jar.dispose();
    }
  });

  test("simultaneous mutual friend requests leave exactly one friendship", async ({ bobPage, timPage }) => {
    const rounds = envRounds(5);
    test.setTimeout(rounds * 15_000 + 30_000);

    const view = async (page: import("@playwright/test").Page) => {
      const body = (await (await page.request.get("/api/friends")).json()) as {
        friends: { username: string }[];
        incomingRequests: { username: string }[];
        outgoingRequests: { username: string }[];
      };
      // every row that mentions the other person, in any state
      return [
        ...body.friends,
        ...body.incomingRequests,
        ...body.outgoingRequests,
      ].filter((person) => person.username === (page === bobPage ? "tim" : "bob"));
    };

    // id of the other side as this page sees it; all three lists carry ids
    const idOf = async (page: import("@playwright/test").Page, username: string) => {
      const body = (await (await page.request.get("/api/friends")).json()) as {
        friends: { id: string; username: string }[];
        incomingRequests: { id: string; username: string }[];
        outgoingRequests: { id: string; username: string }[];
      };
      return [...body.friends, ...body.incomingRequests, ...body.outgoingRequests].find(
        (person) => person.username === username,
      )?.id;
    };

    for (let round = 1; round <= rounds; round++) {
      // bob and tim have no seeded relationship, so both directions are valid
      const [fromBob, fromTim] = await Promise.all([
        bobPage.request.post("/api/friends", { data: { identifier: "tim@test.local" } }),
        timPage.request.post("/api/friends", { data: { identifier: "bob@test.local" } }),
      ]);

      // Either one may win the insert; the loser must be told, not crash, and
      // neither may report a server error. The app reports "this already exists"
      // as 400 with a specific message, not 409: friends/route.ts:125-133 answers
      // badRequest("You are already friends" / "Friend request already sent" /
      // "This user already sent you a friend request"). So 400 here is the
      // documented outcome for the loser, and 409 is never returned.
      for (const response of [fromBob, fromTim]) {
        expect(
          [200, 201, 400],
          `round ${round}: unexpected ${response.status()}: ${await response.text()}`,
        ).toContain(response.status());
      }

      // The composite primary key must prevent a duplicate pair.
      expect(await view(bobPage), `round ${round}`).toHaveLength(1);
      expect(await view(timPage), `round ${round}`).toHaveLength(1);

      // Reset between rounds: without this, rounds 2..N only ever get
      // "already exists" and never race the INSERT again, so they would pass
      // while proving nothing. DELETE takes {userId} and answers 204, but a
      // PENDING row may only be dropped by its requester
      // (friends/route.ts:254-266) - hence the fallback to tim's side.
      if (round < rounds) {
        const timId = await idOf(bobPage, "tim");
        expect(timId, `round ${round}: no bob<->tim row to reset`).toBeTruthy();
        const asBob = await bobPage.request.delete("/api/friends", { data: { userId: timId! } });
        if (asBob.status() !== 204) {
          expect(
            asBob.status(),
            `round ${round}: bob could not drop the row: ${await asBob.text()}`,
          ).toBe(404);
          const bobId = await idOf(timPage, "bob");
          expect(bobId, `round ${round}: no bob<->tim row to reset`).toBeTruthy();
          const asTim = await timPage.request.delete("/api/friends", { data: { userId: bobId! } });
          expect(
            asTim.status(),
            `round ${round}: tim could not drop the row: ${await asTim.text()}`,
          ).toBe(204);
        }
      }
    }
  });

  test("three clients editing one granted document converge on the same content", async ({
    alicePage,
    bobPage,
    timPage,
  }) => {
    const rounds = envRounds(3);
    test.setTimeout(rounds * 60_000 + 30_000);

    // a seeded document in the group where alice is the OWNER
    const docs = (await (await alicePage.request.get("/api/documents")).json()) as {
      id: string;
      title: string;
    }[];
    const target = docs.find((doc) => doc.title === "Test Document");
    expect(target, "seeded document 'Test Document' not found").toBeTruthy();
    const docId = target!.id;

    // find bob's and tim's user ids from alice's friend list, then grant edit
    const friends = (await (await alicePage.request.get("/api/friends")).json()) as {
      friends: { id: string; username: string }[];
    };
    const idOf = async (username: string) => {
      const fromAlice = friends.friends.find((f) => f.username === username)?.id;
      if (fromAlice) return fromAlice;
      const viaGroup = (await (
        await alicePage.request.get(`/api/documents/${docId}/grants`)
      ).json()) as { id: string; username: string }[];
      return viaGroup.find((m) => m.username === username)?.id;
    };
    const bobId = await idOf("bob");
    const timId = await idOf("tim");
    expect(bobId && timId, "could not resolve bob/tim user ids").toBeTruthy();

    for (let round = 1; round <= rounds; round++) {
      try {
        // grants are taken and dropped per round, so every round really has to
        // re-grant instead of riding on a leftover grant from the previous one
        const grants = await Promise.all([
          alicePage.request.put(`/api/documents/${docId}/grants/${bobId}`),
          alicePage.request.put(`/api/documents/${docId}/grants/${timId}`),
        ]);
        for (const [i, grant] of grants.entries()) {
          expect(grant.status(), `round ${round} grant ${i}: ${await grant.text()}`).toBe(204);
        }

        const pages = [
          { page: alicePage, who: "alice", token: `alice-${uniq()}` },
          { page: bobPage, who: "bob", token: `bob-${uniq()}` },
          { page: timPage, who: "tim", token: `tim-${uniq()}` },
        ];

        // all three open the SAME document at the same time
        await Promise.all(
          pages.map(async ({ page }) => {
            await page.goto(`/doc/${docId}`);
            await waitForHydrated(page);
            await expect(editorOf(page), `round ${round}`).toBeVisible();
          }),
        );

        // each one types a unique marker at the end of the document
        await Promise.all(
          pages.map(async ({ page, token }) => {
            const editor = editorOf(page);
            await editor.click();
            await page.keyboard.press("Control+End");
            await page.keyboard.press("Enter");
            await page.keyboard.type(token);
            await expect(editor, `round ${round}`).toContainText(token);
          }),
        );

        // real-time requirement: every connected client must see all three markers
        // (markers from earlier rounds stay in the document, which is why the
        // tokens are unique per round)
        await Promise.all(
          pages.map(async ({ page }) => {
            for (const { token } of pages) {
              await expect(
                editorOf(page),
                `round ${round}: ${token} never reached the other clients`,
              ).toContainText(token, { timeout: 30_000 });
            }
          }),
        );
      } finally {
        // no assertions here - cleanup must never mask the original failure
        await Promise.all([
          alicePage.request.delete(`/api/documents/${docId}/grants/${bobId}`),
          alicePage.request.delete(`/api/documents/${docId}/grants/${timId}`),
        ]);
      }
    }
  });

  test("concurrent renames of one document never corrupt the title", async ({
    alicePage,
    browser,
  }) => {
    const rounds = envRounds(5);
    test.setTimeout(rounds * 20_000 + 30_000);

    // ONE second client for every round: logging alice in again per round would
    // push her past MAX_SESSIONS = 5 after a few rounds, and the cap would
    // revoke the very session alicePage below depends on.
    const second = await browser.newContext({ ignoreHTTPSErrors: true });
    const alice2 = await second.newPage();

    try {
      await alice2.goto("/auth");
      await loginUserExpectSuccess(alice2, seedUser("alice"));

      for (let round = 1; round <= rounds; round++) {
        // a document alice owns outright, fresh per round
        const created = await alicePage.request.post("/api/documents", { data: {} });
        expect(created.status(), `round ${round}: ${await created.text()}`).toBe(201);
        const doc = (await created.json()) as { id: string; title: string };

        try {
          const [first, second_] = await Promise.all([
            alicePage.request.patch(`/api/documents/${doc.id}`, { data: { title: "renamed-by-one" } }),
            alice2.request.patch(`/api/documents/${doc.id}`, { data: { title: "renamed-by-two" } }),
          ]);
          expect(
            [first.status(), second_.status()],
            `round ${round}: ${await first.text()} / ${await second_.text()}`,
          ).toEqual([200, 200]);

          // last write wins is acceptable; a blend of the two titles is corruption
          const after = (await (await alicePage.request.get("/api/documents")).json()) as {
            id: string;
            title: string;
          }[];
          const stored = after.find((d) => d.id === doc.id)!;
          expect(["renamed-by-one", "renamed-by-two"], `round ${round}`).toContain(stored.title);

          // and both clients must render the same single value after a reload
          await Promise.all([
            alicePage.goto(`/doc/${doc.id}`),
            alice2.goto(`/doc/${doc.id}`),
          ]);
          await Promise.all([
            expect(alicePage.getByText(stored.title, { exact: false }).first(), `round ${round}`).toBeVisible(),
            expect(alice2.getByText(stored.title, { exact: false }).first(), `round ${round}`).toBeVisible(),
          ]);
        } finally {
          await alicePage.request.delete(`/api/documents/${doc.id}`);
        }
      }
    } finally {
      await second.close();
    }
  });

  test("simultaneous group creation with the same name keeps both groups", async ({
    alicePage,
    bobPage,
  }) => {
    const rounds = envRounds(5);
    test.setTimeout(rounds * 20_000 + 30_000);

    for (let round = 1; round <= rounds; round++) {
      // group names are not unique, so both inserts must survive and neither may
      // overwrite or merge the other
      const name = `parallel-${uniq()}`;
      const [fromAlice, fromBob] = await Promise.all([
        alicePage.request.post("/api/groups", { data: { name } }),
        bobPage.request.post("/api/groups", { data: { name } }),
      ]);

      let aliceGroupId: string | undefined;
      let bobGroupId: string | undefined;
      try {
        expect(fromAlice.status(), `round ${round}: ${await fromAlice.text()}`).toBe(201);
        expect(fromBob.status(), `round ${round}: ${await fromBob.text()}`).toBe(201);

        const aliceGroup = (await fromAlice.json()) as { id: string; name: string };
        const bobGroup = (await fromBob.json()) as { id: string; name: string };
        aliceGroupId = aliceGroup.id;
        bobGroupId = bobGroup.id;

        expect(aliceGroup.id, `round ${round}`).not.toBe(bobGroup.id);
        expect(aliceGroup.name, `round ${round}`).toBe(name);
        expect(bobGroup.name, `round ${round}`).toBe(name);

        // each owner really owns their own copy
        await alicePage.reload();
        await waitForDashboardReady(alicePage);
        // The Groups accordion is CONTROLLED (DashboardSidebar.tsx:282 value=
        // {openSections}), so clicking the trigger on an already-open section
        // COLLAPSES it and hides the list. 03-groups.spec.ts:29-33 guards the click;
        // an unconditional click is what made the group button unfindable.
        const newGroupButton = alicePage.getByRole("button", { name: /new group/i });
        if (!(await newGroupButton.isVisible().catch(() => false))) {
          await alicePage.getByRole("button", { name: /^Groups$/ }).click();
        }
        await expect(newGroupButton, `round ${round}`).toBeVisible();
        await expect(
          alicePage.getByRole("button", { name, exact: true }),
          `round ${round}`,
        ).toBeVisible();
      } finally {
        // every round cleans up its own groups: a failed assertion must not
        // leak groups into later rounds or into later specs
        if (aliceGroupId) await alicePage.request.delete(`/api/groups/${aliceGroupId}`);
        if (bobGroupId) await bobPage.request.delete(`/api/groups/${bobGroupId}`);
      }
    }
  });
});
