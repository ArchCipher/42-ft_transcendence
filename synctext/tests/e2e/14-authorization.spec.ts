/*
Endpoints are public knowledge.

Anything the browser calls can be discovered by anyone: the DevTools network
tab, the JS bundle, a proxy log, or plain guessing. So "the button was disabled"
is not a security property - only a check on the server is. These tests call the
API directly, with no UI in the way, and assert the server refuses.

Two properties, both grounded in the source:

  A. No endpoint hands anything to an UNAUTHENTICATED caller.
     The list of routes is read from the filesystem, so a new endpoint is
     covered automatically and cannot be quietly forgotten.

  B. Authorization is enforced per relationship, and outsiders cannot even learn
     that a resource exists. From lib/api/responses.ts:
       "Outsiders get 404 rather than 403 so they cannot learn that a group or
        document exists; 403 is only for members who lack the right."
     And from lib/permissions.ts:
       canEdit = groupRole === OWNER || hasGrant
       canAdminGroup = OWNER || ADMIN

Rate limiting: everything here runs as seeded accounts, except the cleanup
sweep's own sign-up, which takes the last of the "5 hourly spots".
A few malformed bodies are sent on purpose; they never reach the login
limiter, and the only unauthenticated POSTs that could count as failures target
register/verify-email, which the limiter only records on success.
*/
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test, expect } from "./fixtures/auth";
import { internalPost } from "./utils/internal-post";
import { seedUser } from "./utils/seed-users";
import { makeUser } from "./utils/test-helpers";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

/*
Endpoints that are SUPPOSED to answer without a session. Everything else must
refuse. Keep this list short and justify every entry.
*/
const PUBLIC_ENDPOINTS = new Set([
  // the sign-up / sign-in surface: that is the point of these endpoints
  "POST /api/auth/register",
  "POST /api/auth/login",
  "POST /api/auth/forgot-password",
  "POST /api/auth/password-reset",
  "GET /api/auth/verify-email",
  "POST /api/auth/resend-verification",
  // a guest gets a session cookie from the token in the body, not from a login
  "POST /api/guest-documents",
  // logging out without a session is a no-op, not a disclosure
  "POST /api/auth/logout",
  "GET /api/auth/logout",
  /*
  Session *status* endpoints. Both answer 200 {signedIn:boolean} to anyone, and
  that is correct: SessionGuard polls them on protected pages and on tab refocus,
  so a signed-out visitor must be able to learn that they are signed out. They
  disclose a single boolean about the caller's OWN cookie and no user data, which
  the caller already knows. Treating a 200 here as a "leak" flagged the security
  property backwards - the test must assert the body, not the status code.
    app/api/session/route.ts:20,25          -> {signedIn:false}
    app/api/session/activity/route.ts:17,27-> {signedIn:boolean}
  */
  "GET /api/session",
  "POST /api/session/activity",
]);

const appRoot = () => {
  const configFile = test.info().config.configFile;
  return configFile ? dirname(configFile) : process.cwd();
};

function routeFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) routeFiles(full, found);
    else if (entry === "route.ts") found.push(full);
  }
  return found;
}

/** "/api/groups/[id]/members" + "POST" -> "POST /api/groups/{id}/members" */
function endpointKey(file: string, method: string): string {
  const url = file
    .slice(join(appRoot(), "app").length)
    .replace(/[\\/]route\.ts$/, "")
    // dynamic segments become a placeholder, so the request 404s rather than
    // accidentally matching a real row
    .replace(/\[[^\]]+\]/g, "{id}")
    .replace(/\\/g, "/");
  return `${method} ${url}`;
}

function handlerMethods(contents: string): string[] {
  return METHODS.filter((method) =>
    new RegExp(`export (async function|const) ${method}\\b`).test(contents),
  );
}

test.describe("III.3 the API refuses what the UI merely hides", () => {
  test("no endpoint answers an unauthenticated caller", async ({ request }) => {
    const root = join(appRoot(), "app", "api");
    const endpoints: string[] = [];

    for (const file of routeFiles(root)) {
      for (const method of handlerMethods(readFileSync(file, "utf8"))) {
        endpoints.push(endpointKey(file, method));
      }
    }

    // the scan must actually find the surface, or this test passes vacuously
    expect(
      endpoints.length,
      "no routes were discovered - has the app/api layout changed?",
    ).toBeGreaterThan(30);

    const leaks: string[] = [];

    for (const key of endpoints) {
      if (PUBLIC_ENDPOINTS.has(key)) continue;

      const [method, url] = key.split(" ") as [
        (typeof METHODS)[number],
        string,
      ];
      const response = await request.fetch(url, {
        method,
        failOnStatusCode: false,
        maxRedirects: 0,
      });
      const status = response.status();

      if (status >= 200 && status < 300) {
        const body = await response.text();
        leaks.push(`${key} -> ${status} ${body.slice(0, 120)}`);
      }
      // 400/401/403/404/405 all mean "refused", which is what we want
    }

    expect(
      leaks,
      `these endpoints served an unauthenticated caller:\n  ${leaks.join("\n  ")}`,
    ).toEqual([]);
  });

  test("internal service endpoints are not open to the internet", async ({
    request,
  }) => {
    // /api/internal/* is reached by the collab service and the cleanup job on the
    // backend network. It is protected by x-internal-service-token
    // (lib/auth/internal.ts), and after the nginx rule is added it is 404 here.
    for (const url of [
      "/api/internal/auth/verify",
      "/api/internal/auth/cleanup",
      "/api/internal/guest-sessions/cleanup",
      "/api/internal/documents/whatever/state",
    ]) {
      const response = await request.post(url, {
        data: {},
        failOnStatusCode: false,
      });
      expect(
        response.status(),
        `${url} answered ${response.status()} without a service token`,
      ).toBeGreaterThanOrEqual(400);
    }
  });

  test("document rights follow the relationship, not the UI", async ({
    alicePage,
    bobPage,
    timPage,
  }) => {
    test.setTimeout(90_000);

    // alice owns a group and puts bob in it as a plain MEMBER
    const created = await alicePage.request.post("/api/groups", {
      data: { name: `authz-${Math.random().toString(36).slice(2, 8)}` },
    });
    expect(created.status(), await created.text()).toBe(201);
    const group = (await created.json()) as { id: string; name: string };

    const friends = (await (
      await alicePage.request.get("/api/friends")
    ).json()) as {
      friends: { id: string; username: string }[];
    };
    const bobId = friends.friends.find((f) => f.username === "bob")!.id;

    const added = await alicePage.request.post(
      `/api/groups/${group.id}/members`,
      {
        data: { userId: bobId },
      },
    );
    expect(added.status(), await added.text()).toBe(201);

    const doc = (await (
      await alicePage.request.post("/api/documents", {
        data: { groupId: group.id },
      })
    ).json()) as { id: string };

    try {
      // 1. an outsider must get 404, never 403: a 403 would confirm the
      //    document exists, which is the leak lib/api/responses.ts warns about
      for (const page of [timPage]) {
        for (const [method, url] of [
          ["GET", `/api/documents/${doc.id}`],
          ["PATCH", `/api/documents/${doc.id}`],
          ["DELETE", `/api/documents/${doc.id}`],
        ] as const) {
          const response = await page.request.fetch(url, {
            method,
            ...(method === "PATCH" ? { data: { title: "hijacked" } } : {}),
            failOnStatusCode: false,
          });
          expect(
            response.status(),
            `${method} ${url} as a non-member returned ${response.status()}, expected 404`,
          ).toBe(404);
        }
      }

      // 2. a member without a grant may READ but not EDIT
      const read = await bobPage.request.get(`/api/documents/${doc.id}`, {
        failOnStatusCode: false,
      });
      expect(read.status()).toBe(200);

      const denied = await bobPage.request.patch(`/api/documents/${doc.id}`, {
        data: { title: "member should not be able to" },
        failOnStatusCode: false,
      });
      expect(
        denied.status(),
        "a plain MEMBER was allowed to edit; canEdit must be OWNER or a grant",
      ).toBe(403);

      // and the title must not have changed
      const stillOwned = (await (
        await alicePage.request.get(`/api/documents/${doc.id}`)
      ).json()) as { title: string };
      expect(stillOwned.title).not.toBe("member should not be able to");

      // 3. a grant opens exactly one door, and revoking it closes it again
      const grant = await alicePage.request.put(
        `/api/documents/${doc.id}/grants/${bobId}`,
      );
      expect(grant.status(), await grant.text()).toBe(204);

      const allowed = await bobPage.request.patch(`/api/documents/${doc.id}`, {
        data: { title: "edited after grant" },
      });
      expect(allowed.status(), await allowed.text()).toBe(200);

      const revoke = await alicePage.request.delete(
        `/api/documents/${doc.id}/grants/${bobId}`,
      );
      expect(revoke.status()).toBe(204);

      const reDenied = await bobPage.request.patch(`/api/documents/${doc.id}`, {
        data: { title: "edited after revoke" },
        failOnStatusCode: false,
      });
      expect(reDenied.status(), "the grant was not actually revoked").toBe(403);
    } finally {
      await alicePage.request.delete(`/api/documents/${doc.id}`);
      await alicePage.request.delete(`/api/groups/${group.id}`);
    }
  });

  test("group administration follows canOwnGroup and canAdminGroup", async ({
    alicePage,
    bobPage,
    timPage,
  }) => {
    test.setTimeout(90_000);

    // the two rules differ, and both are enforced server-side:
    //   canOwnGroup   = OWNER only          -> rename and delete the group
    //   canAdminGroup = OWNER or ADMIN      -> add and remove members
    // bob is a plain MEMBER here, so both must refuse him.

    const created = await alicePage.request.post("/api/groups", {
      data: { name: `admin-${Math.random().toString(36).slice(2, 8)}` },
    });
    expect(created.status()).toBe(201);
    const group = (await created.json()) as { id: string };

    const friends = (await (
      await alicePage.request.get("/api/friends")
    ).json()) as {
      friends: { id: string; username: string }[];
    };
    const bobId = friends.friends.find((f) => f.username === "bob")!.id;

    try {
      // an outsider cannot even see the member list
      const peek = await timPage.request.get(
        `/api/groups/${group.id}/members`,
        {
          failOnStatusCode: false,
        },
      );
      expect(peek.status()).toBe(404);

      // a MEMBER cannot add members or rename the group
      await alicePage.request.post(`/api/groups/${group.id}/members`, {
        data: { userId: bobId },
      });

      const memberAdds = await bobPage.request.post(
        `/api/groups/${group.id}/members`,
        {
          data: { userId: "somebody" },
          failOnStatusCode: false,
        },
      );
      expect(memberAdds.status(), "a MEMBER was allowed to add members").toBe(
        403,
      );

      const memberRenames = await bobPage.request.patch(
        `/api/groups/${group.id}`,
        {
          data: { name: "renamed by a member" },
          failOnStatusCode: false,
        },
      );
      // 403, not 404: he IS a member, he just does not own the group
      expect(
        memberRenames.status(),
        "a MEMBER was allowed to rename the group",
      ).toBe(403);

      // the owner can
      const ownerRenames = await alicePage.request.patch(
        `/api/groups/${group.id}`,
        {
          data: { name: "renamed by the owner" },
        },
      );
      expect(ownerRenames.status(), await ownerRenames.text()).toBe(200);
    } finally {
      await alicePage.request.delete(`/api/groups/${group.id}`);
    }
  });

  test("a valid session cannot be replayed after logout", async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto("/auth");
    const account = seedUser("alice");
    await page.getByLabel(/email/i).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: /^login$/i }).click();
    await page.waitForURL(/dashboard/);

    // /api/session is a status endpoint: it answers 200 whether or not you are
    // signed in, so the STATUS proves nothing. The body is the real assertion.
    const before = await page.request.get("/api/session");
    expect(before.status()).toBe(200);
    expect(
      await before.json(),
      "the session was not live before logout",
    ).toEqual({
      signedIn: true,
    });

    expect((await page.request.post("/api/auth/logout")).status()).toBe(200);

    // and the session must really be gone, not just hidden
    const after = await page.request.get("/api/session");
    expect(after.status()).toBe(200);
    expect(
      await after.json(),
      "the session survived logout - it can still be replayed",
    ).toEqual({ signedIn: false });
  });
});

test.describe("internal auth cleanup sweep", () => {
  test("leaves a verified account alone", async ({ request }) => {
    const sweep = internalPost("/api/internal/auth/cleanup");
    expect(sweep.status, sweep.body).toBe(200);
    expect(JSON.parse(sweep.body).ok).toBe(true);

	const alice = seedUser("alice");
    // deletion would turn this into 401 (no row -> dummy hash never verifies)
    const login = await request.post("/api/auth/login", {
      data: { email: alice.email, password: alice.password },
    });
    expect(login.status()).toBe(200);
  });

  test("leaves a signup whose verification link is still live alone", async ({
    request,
  }) => {
    const fresh = makeUser("sweep"); // unverified, token valid for 24h
    const registered = await request.post("/api/auth/register", {
      data: fresh,
    });
    // 01 + 07 + 11 + 12 spend 4 of the 5 hourly sign-up slots; if a later spec
    // took the last one there is nothing left to prove here
    test.skip(
      registered.status() === 429,
      "sign-up quota already spent by an earlier spec",
    );
    expect(registered.status()).toBe(201);

    const sweep = internalPost('/api/internal/auth/cleanup');
    expect(sweep.status, sweep.body).toBe(200);
    expect(JSON.parse(sweep.body).ok).toBe(true);

    // wrong answer for each way the account could have been lost:
    //   deleted -> 401 (no user row), verified by mistake -> 200
    const login = await request.post("/api/auth/login", {
      data: { email: fresh.email, password: fresh.password },
    });
    expect(login.status()).toBe(403);
    expect((await login.json()).error).toBe("Verify your email");
  });
});
