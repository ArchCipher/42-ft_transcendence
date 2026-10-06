/*
subject.txt III.2: "No warnings or errors should appear in the browser console."

This spec walks a real user journey with the console guard attached BEFORE the
first navigation, and fails on:
  - console.error
  - console.warning  (React dev warnings, deprecations, bad prop types)
  - uncaught exceptions (pageerror)

>=400 responses and failed requests are collected and printed, but NOT asserted:
the application makes deliberate 4xx calls (a poll against a document that is
still being created, an expired session) and those are not console errors.

Rate limiting: uses the seeded account `alice` so the spec never spends one of
the 5 hourly registration slots.
*/
import { test, expect } from "./fixtures/auth";
import { watchConsole } from "./utils/console-guard";
import { seedUser } from "./utils/seed-users";
import {
  loginUserExpectSuccess,
  startDocRename,
  waitForDashboardReady,
  waitForHydrated,
} from "./utils/test-helpers";

// tiptap mounts the editable surface as a contenteditable div; it is the only
// contenteditable element on the document page.
const editorOf = (page: import("@playwright/test").Page) =>
  page.locator('[contenteditable="true"]').first();

test.describe("III.2 browser console stays clean", () => {
  test("public and legal pages produce no console errors or warnings", async ({ page }) => {
    const console_ = watchConsole(page);

    for (const path of ["/", "/auth", "/register", "/forgot-password", "/resend-verification"]) {
      await page.goto(path);
      await waitForHydrated(page);
      await expect(page.locator("body")).toBeVisible();
    }

    // Privacy Policy + Terms of Service must exist and render (III.2 requires
    // them; an empty page usually means a crashed server component).
    for (const path of ["/privacy", "/terms", "/cookies", "/accessibility"]) {
	 const ALLOWED_SUBSTRINGS: string[] = ["loading failed for the <script>", "due to access control checks",];
      await page.goto(path);
      await waitForHydrated(page);
      const body = await page.locator("body").innerText();
      expect(body.length, `${path} rendered an empty page`).toBeGreaterThan(200);
    }

    expect(console_.errors, console_.report()).toEqual([]);
    expect(console_.warnings, console_.report()).toEqual([]);
    expect(console_.pageErrors, console_.report()).toEqual([]);
  });

  test("login and the dashboard shell are console-clean", async ({ page }) => {
    const console_ = watchConsole(page);

    await page.goto("/auth");
    await loginUserExpectSuccess(page, seedUser("alice"));
    await waitForDashboardReady(page);

    // open and dismiss the group dialog: modals are the usual source of
    // focus-trap and aria-hidden console warnings
	const newGroupButton = page.getByRole("button", { name: "New group" });
	if (!(await newGroupButton.isVisible()))
		await page.getByRole("button", { name: /^Groups$/ }).click();
    await newGroupButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.goto("/profile");
    await waitForHydrated(page);
    await expect(page.locator("body")).toBeVisible();

    expect(console_.errors, console_.report()).toEqual([]);
    expect(console_.warnings, console_.report()).toEqual([]);
    expect(console_.pageErrors, console_.report()).toEqual([]);
  });

  test("creating, editing and renaming a document is console-clean", async ({ page }) => {
    test.setTimeout(90_000); // argon2 + first collab connection are slow
    const console_ = watchConsole(page);

    await page.goto("/auth");
    await loginUserExpectSuccess(page, seedUser("alice"));
    await waitForDashboardReady(page);

    // create a document through the UI tile (DocumentsDashboard.tsx PlusButton,
    // aria-label "Create document"). createDocument() pushes /doc/<id> itself.
    await page.getByRole("button", { name: "Create document" }).click();
    await page.waitForURL(/\/doc\//);
    await waitForHydrated(page);

    // type real content: exercises the collaborative editor and the websocket
    const editor = editorOf(page);
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type("console audit paragraph");
    await expect(editor).toContainText("console audit paragraph");

    // rename exercises the inline title editor
    await startDocRename(page);
    await page.getByLabel("Document title", {exact: true}).fill("Console audit doc");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Console audit doc", exact: true }),
    ).toBeVisible();

    expect(console_.errors, console_.report()).toEqual([]);
    expect(console_.warnings, console_.report()).toEqual([]);
    expect(console_.pageErrors, console_.report()).toEqual([]);
  });

  test("logging out through the account menu is console-clean", async ({ page }) => {
    const console_ = watchConsole(page);

    await page.goto("/auth");
    await loginUserExpectSuccess(page, seedUser("alice"));
    await waitForDashboardReady(page);

    // the real user path: open the account menu (UserMenu.tsx Menu.Trigger) and
    // pick Logout (Menu.Item). The helper logout() would skip the menu entirely.
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/auth/logout") && r.request().method() === "POST",
      ),
      (async () => {
        await page.getByRole("button", { name: "Account menu" }).click();
        await page.getByRole("menuitem", { name: "Logout" }).click();
      })(),
    ]);
    expect(response.status()).toBe(200);

    // logoutClient() pushes LOGGED_OUT_URL = /auth?verify=logged-out
    await page.waitForURL(/\/auth\?verify=logged-out/);

    // and the session must really be gone, not just hidden. /api/session is a
    // status endpoint: it answers 200 either way, so the body is the assertion.
    const session = await page.request.get("/api/session");
    expect(session.status()).toBe(200);
    expect(await session.json(), "the session survived logout").toEqual({
      signedIn: false,
    });

    expect(console_.errors, console_.report()).toEqual([]);
    expect(console_.warnings, console_.report()).toEqual([]);
    expect(console_.pageErrors, console_.report()).toEqual([]);
  });
});
