/*
subject.txt III.3: "All forms and user inputs must be properly validated in both
the frontend and backend."

Backend rules this spec pins down (read from the source, not guessed):
  - lib/auth/validation.ts
      email    trim + lowercase + max 254 + valid email + local part <= 63
               + domain labels 1-63 chars, no leading/trailing '-'
      password min 8, max 128, and must pass the strength check
      username trim + lowercase, 3-32 chars, /^[a-zA-Z0-9_]+$/
      every auth schema is .strict(), so unknown keys are rejected
  - validation failures answer 400 { error, fields }
  - lib/api/responses.ts readName(): group name trimmed, 1-120 chars
  - PATCH /api/documents/[id]: title trimmed, 1-120 chars

Frontend rule: an invalid value must be rejected IN THE BROWSER, before any
request leaves it. The proof is a request counter, not an error message: a test
that only checks the error text would also pass if the server did the work.

Quota warning: registration allows 5 SUCCESSFUL signups per hour per IP, and the
limiter lives in the web process memory. Only the last case here creates a real
account, so this spec spends 1 of the 5 slots. Restart the web container (or
wait) between full suite runs, otherwise registration starts failing with 429.
*/
import { test, expect } from "./fixtures/auth";
import {
  startDocRename,
  waitForDashboardReady,
  waitForHydrated,
} from "./utils/test-helpers";

const uniq = () => Math.random().toString(36).slice(2, 10);
const STRONG_PASSWORD = "Correct-Horse-9-Battery";

/**
 * Records matching requests so a test can prove that none were sent.
 * Filter by method as well as URL: the page legitimately GETs the document
 * while a rename is being attempted.
 */
function watchRequests(
  page: import("@playwright/test").Page,
  fragment: string,
  method: string,
) {
  const seen: string[] = [];
  page.on("request", (request) => {
    if (request.method() === method && request.url().includes(fragment)) {
      seen.push(`${request.method()} ${request.url()}`);
    }
  });
  return seen;
}

test.describe("III.3 backend input validation", () => {
  test("registration rejects every malformed field", async ({ request }) => {
    const cases: { name: string; payload: Record<string, unknown>; expectField?: string }[] = [
      { name: "missing @ in email", payload: { email: "not-an-email", username: "valid1", password: STRONG_PASSWORD }, expectField: "email" },
      { name: "email domain without a dot", payload: { email: "a@localhost", username: "valid2", password: STRONG_PASSWORD }, expectField: "email" },
      { name: "domain label starting with a hyphen", payload: { email: "a@-bad.com", username: "valid3", password: STRONG_PASSWORD }, expectField: "email" },
      { name: "email longer than 254", payload: { email: `${"a".repeat(250)}@test.local`, username: "valid4", password: STRONG_PASSWORD }, expectField: "email" },
      { name: "local part longer than 63", payload: { email: `${"a".repeat(64)}@test.local`, username: "valid5", password: STRONG_PASSWORD }, expectField: "email" },
      { name: "email is not a string", payload: { email: 42, username: "valid6", password: STRONG_PASSWORD }, expectField: "email" },
      { name: "password shorter than 8", payload: { email: `p${uniq()}@test.local`, username: "valid7", password: "Ab3!def" }, expectField: "password" },
      { name: "password longer than 128", payload: { email: `p${uniq()}@test.local`, username: "valid8", password: `${STRONG_PASSWORD}${"x".repeat(140)}` }, expectField: "password" },
      { name: "password too weak", payload: { email: `p${uniq()}@test.local`, username: "valid9", password: "password" }, expectField: "password" },
      { name: "username shorter than 3", payload: { email: `p${uniq()}@test.local`, username: "ab", password: STRONG_PASSWORD }, expectField: "username" },
      { name: "username longer than 32", payload: { email: `p${uniq()}@test.local`, username: "u".repeat(33), password: STRONG_PASSWORD }, expectField: "username" },
      { name: "username with a space", payload: { email: `p${uniq()}@test.local`, username: "bad name", password: STRONG_PASSWORD }, expectField: "username" },
      { name: "username with punctuation", payload: { email: `p${uniq()}@test.local`, username: "bad<script>", password: STRONG_PASSWORD }, expectField: "username" },
      { name: "username is not a string", payload: { email: `p${uniq()}@test.local`, username: { $ne: null }, password: STRONG_PASSWORD }, expectField: "username" },
    ];

    for (const testCase of cases) {
      const response = await request.post("/api/auth/register", { data: testCase.payload });
      const body = (await response.json().catch(() => null)) as { error?: string; fields?: Record<string, string[]> } | null;

      expect(response.status(), `${testCase.name} -> ${JSON.stringify(body)}`).toBe(400);
      expect(body?.error, `${testCase.name} has no error message`).toBeTruthy();
      if (testCase.expectField) {
        expect(
          body?.fields?.[testCase.expectField],
          `${testCase.name} did not report a problem on "${testCase.expectField}": ${JSON.stringify(body)}`,
        ).toBeTruthy();
      }
    }
  });

  test("registration rejects unknown fields and privilege escalation", async ({ request }) => {
    // .strict() must drop parameter pollution and role injection
    for (const extra of [{ role: "ADMIN" }, { isAdmin: true }, { id: "chosen-by-attacker" }]) {
      const response = await request.post("/api/auth/register", {
        data: {
          email: `esc-${uniq()}@test.local`,
          username: `esc${uniq().replace(/[^a-z0-9]/g, "")}`,
          password: STRONG_PASSWORD,
          ...extra,
        },
      });
      expect(response.status(), `accepted extra field ${JSON.stringify(extra)}`).toBe(400);
    }
  });

  test("a body that is not JSON is rejected without a crash", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      headers: { "content-type": "application/json" },
      data: "this is not json",
    });
    expect(response.status()).toBe(400);
    expect(response.status()).toBeLessThan(500);
  });

  test("login validation failures do not reveal whether the account exists", async ({ request }) => {
    // NOTE: failed logins feed the per-IP limiter (10 per 15 min), so this file
    // deliberately makes only a couple of them.
    const malformed = await request.post("/api/auth/login", {
      data: { email: "nope", password: "x" },
    });
    expect(malformed.status()).toBe(400);

    const unknownAccount = await request.post("/api/auth/login", {
      data: { email: `ghost-${uniq()}@test.local`, password: STRONG_PASSWORD },
    });
    expect(unknownAccount.status()).toBe(401);
  });

  test("group names are trimmed and bounded to 1-120 characters", async ({ alicePage }) => {
    const rejected: unknown[] = [
      "",
      "   ",
      "\t\n ",
      "x".repeat(121),
      42,
      null,
      ["array"],
      { nested: "object" },
    ];

    for (const name of rejected) {
      const response = await alicePage.request.post("/api/groups", { data: { name } });
      expect(response.status(), `accepted group name ${JSON.stringify(name)}`).toBe(400);
    }

    // missing key entirely
    const missing = await alicePage.request.post("/api/groups", { data: {} });
    expect(missing.status()).toBe(400);

    // boundaries: 1 and 120 characters are valid, and get trimmed
    const one = await alicePage.request.post("/api/groups", { data: { name: "x" } });
    expect(one.status(), await one.text()).toBe(201);
    const longest = await alicePage.request.post("/api/groups", {
      data: { name: `  ${"y".repeat(120)}  ` },
    });
    expect(longest.status(), await longest.text()).toBe(201);

    // stored trimmed, not padded
    const longestBody = (await longest.json()) as { id: string; name: string };
    expect(longestBody.name).toBe("y".repeat(120));

    // cleanup
    const oneBody = (await one.json()) as { id: string };
    await Promise.all([
      alicePage.request.delete(`/api/groups/${longestBody.id}`),
      alicePage.request.delete(`/api/groups/${oneBody.id}`),
    ]);
  });

  test("document titles are trimmed and bounded to 1-120 characters", async ({ alicePage }) => {
    const created = await alicePage.request.post("/api/documents", { data: {} });
    expect(created.status(), await created.text()).toBe(201);
    const doc = (await created.json()) as { id: string };

    try {
      for (const title of ["", "   ", "z".repeat(121), 7, null, { a: 1 }]) {
        const response = await alicePage.request.patch(`/api/documents/${doc.id}`, {
          data: { title },
        });
        expect(response.status(), `accepted title ${JSON.stringify(title)}`).toBe(400);
      }

      const ok = await alicePage.request.patch(`/api/documents/${doc.id}`, {
        data: { title: `  ${"z".repeat(120)}  ` },
      });
      expect(ok.status(), await ok.text()).toBe(200);

      const docs = (await (await alicePage.request.get("/api/documents")).json()) as {
        id: string;
        title: string;
      }[];
      expect(docs.find((d) => d.id === doc.id)?.title).toBe("z".repeat(120));
    } finally {
      await alicePage.request.delete(`/api/documents/${doc.id}`);
    }
  });

  test("markup in a title is stored as text, never executed", async ({ alicePage }) => {
    const payload = `<script>window.__pwned = true</script>${"q".repeat(60)}`;

    const created = await alicePage.request.post("/api/documents", { data: {} });
    const doc = (await created.json()) as { id: string };

    try {
      const renamed = await alicePage.request.patch(`/api/documents/${doc.id}`, {
        data: { title: payload },
      });
      expect(renamed.status()).toBe(200);

      await alicePage.goto(`/doc/${doc.id}`);
      await expect(alicePage.locator("body")).toContainText("<script>");
      expect(
        await alicePage.evaluate(() => (window as { __pwned?: boolean }).__pwned),
        "injected script executed",
      ).toBeUndefined();
    } finally {
      await alicePage.request.delete(`/api/documents/${doc.id}`);
    }
  });

  test("username of exactly 32 characters is accepted", async ({ request }) => {
    // the only case in this file that really creates an account (1 of 5 slots)
    const username = `u${uniq().replace(/[^a-z0-9]/g, "")}`.slice(0, 32).padEnd(32, "x");
    expect(username).toHaveLength(32);

    const response = await request.post("/api/auth/register", {
      data: { email: `boundary-${uniq()}@test.local`, username, password: STRONG_PASSWORD },
    });
    expect(response.status(), await response.text()).toBe(201);
  });
});

test.describe("III.3 frontend validates before sending", () => {
  // shared field setup for the three register-form cases below
  const registerFields = async (page: import("@playwright/test").Page) => {
    await page.goto("/register");
    await waitForHydrated(page);

    return {
      posts: watchRequests(page, "/api/auth/register", "POST"),
      email: page.getByLabel(/email/i),
      username: page.getByLabel(/username/i),
      password: page.getByLabel("Password", { exact: true }),
      confirm: page.getByLabel(/confirm password/i),
      submit: page.getByRole("button", { name: /^register(ing\.\.\.)?$/i }),
    };
  };

  const goodUsername = () => `front${uniq().replace(/[^a-z0-9]/g, "")}`;

  test("the register form never posts a malformed email", async ({ page }) => {
    const { posts, email, username, password, confirm, submit } =
      await registerFields(page);

    // The email input is type="email" + required (register-form.tsx:81,84) and
    // the <form> carries no noValidate, so the BROWSER blocks the submit
    // natively. That is a real frontend refusal: no request is ever made.
    await email.fill("not-an-email");
    await username.fill(goodUsername());
    await password.fill(STRONG_PASSWORD);
    await confirm.fill(STRONG_PASSWORD);
    await submit.click();

    await expect(page).toHaveURL(/\/register/);
    expect(posts, "the client posted a malformed email").toHaveLength(0);

    // the browser marks the control :invalid and shows its own bubble, so the
    // evidence is the pseudo-class rather than DOM text
    const validity = await email.evaluate((el) => {
      const input = el as HTMLInputElement;
      return {
        valid: input.validity.valid,
        typeMismatch: input.validity.typeMismatch,
        message: input.validationMessage,
      };
    });
    expect(validity.valid, validity.message).toBe(false);
    expect(validity.typeMismatch, `validity: ${JSON.stringify(validity)}`).toBe(true);
  });

  test("the register form never posts a password the strength check rejects", async ({ page }) => {
    const { posts, email, username, password, confirm, submit } =
      await registerFields(page);

    await email.fill(`front-${uniq()}@test.local`);
    await username.fill(goodUsername());
    await password.fill("password"); // 8 chars: clears min(8), fails zxcvbn
    await confirm.fill("password");
    await submit.click();

    await expect(page).toHaveURL(/\/register/);
    expect(posts, "the client posted a zxcvbn-weak password").toHaveLength(0);
  });

  /*
  KNOWN GAP. usernameSchema forbids anything outside ^[a-zA-Z0-9_]+$
  (lib/auth/validation.ts:64), but the username input only has maxLength and
  required - no pattern - so the browser has no reason to refuse a name with a
  space. Add a pattern to the input to close this.
  */
  test("the register form never posts an illegal username", async ({ page }) => {
    const { posts, email, username, password, confirm, submit } =
      await registerFields(page);

    await email.fill(`front-${uniq()}@test.local`);
    await username.fill("bad name");
    await password.fill(STRONG_PASSWORD);
    await confirm.fill(STRONG_PASSWORD);
    await submit.click();

    await expect(page).toHaveURL(/\/register/);
    expect(posts, "the client posted an illegal username").toHaveLength(0);
  });

  test("the group dialog never posts an empty name", async ({ alicePage }) => {
    const posts = watchRequests(alicePage, "/api/groups", "POST");
    await waitForDashboardReady(alicePage);

    // the Groups accordion is controlled (DashboardSidebar.tsx:282), so only click
    // the trigger when the section is actually closed
    const newGroupButton = alicePage.getByRole("button", { name: "New group" });
    if (!(await newGroupButton.isVisible().catch(() => false))) {
      await alicePage.getByRole("button", { name: /^Groups$/ }).click();
    }
    await newGroupButton.click();

    const dialog = alicePage.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // whitespace only: the server trims this to an empty string
    await dialog.getByLabel("Group name").fill("   ");

    // The client disables Create for a whitespace-only name, so the request is
    // never attempted. Asserting that is the real property - clicking the
    // disabled button instead just retried until the 30s timeout, which is how
    // this test failed. ManagerDialog.tsx renders data-disabled + disabled.
    const create = dialog.getByRole("button", { name: "Create" });
    await expect(create).toBeDisabled();
    await expect(create).toHaveAttribute("disabled", "");

    await alicePage.waitForTimeout(500); // give a stray request time to appear
    expect(posts, "the client posted a whitespace-only group name").toHaveLength(0);

    await alicePage.keyboard.press("Escape");
  });

  test("renaming a document to nothing never reaches the server", async ({ alicePage }) => {
    const created = await alicePage.request.post("/api/documents", { data: {} });
    const doc = (await created.json()) as { id: string };
    const patches = watchRequests(alicePage, `/api/documents/${doc.id}`, "PATCH");

    try {
      await alicePage.goto(`/doc/${doc.id}`);
      await waitForHydrated(alicePage);
      await startDocRename(alicePage);
      const input = alicePage.getByLabel("Document title", {exact: true});
      await input.fill("");
      await input.blur();
      await alicePage.waitForTimeout(500);

      expect(patches, "the client sent an empty title").toHaveLength(0);
    } finally {
      await alicePage.request.delete(`/api/documents/${doc.id}`);
    }
  });
});
