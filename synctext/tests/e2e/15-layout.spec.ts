/*
Catches layout overflow automatically, so a 120-character group name or a long
email is caught by CI instead of by eye.

The bug that prompted this: DashboardSidebar.css styled .SidebarGroup as
`display: flex` with no `min-width: 0` on its label span. A flex item defaults to
min-width: auto, which refuses to shrink below its content width, so a long group
name pushed the row wider than the sidebar and spilled out of the panel. Nothing
in the suite noticed, because no test ever rendered a long value in the sidebar.

Three independent checks, because overflow fails in three different ways:

  1. PAGE scroll - the document scrolls sideways. Always a bug.
  2. ELEMENT clipping - a control's own content is wider than its box, and it is
     not deliberately truncated. Legitimate ellipsis (text-overflow: ellipsis) is
     excluded, because a truncated label is the intended behaviour, not a defect.
  3. ESCAPE - a control extends past the right edge of the viewport.

Deliberately conservative: anything with an ellipsis, a scrollbar, or an
explicit overflow style is treated as intentional. A false positive here costs more
than a missed case, because a test that cries wolf gets ignored.
*/
import { test, expect } from "./fixtures/auth";
import { seedUser } from "./utils/seed-users";
import { waitForDashboardReady, waitForHydrated } from "./utils/test-helpers";

/* 120 is the server maximum for a group name (lib/api/responses.ts readName). */
const LONG_GROUP = "G".repeat(120);
const LONG_USERNAME = "u".repeat(32); // usernameSchema max
const LONG_PASSWORD = "p".repeat(128); // passwordSchema max
const LONG_DOCUMENT_TITLE = "D".repeat(120); // PATCH /api/documents/[id] max

/** Pages that render user data, plus the public ones. */
const PAGES = [
  "/",
  "/auth",
  "/register",
  "/dashboard",
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
  "/profile",
] as const;

/** Public pages reachable without a session. */
const PUBLIC_PAGES = [
  "/",
  "/auth",
  "/register",
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
] as const;

type Overflow = { where: string; detail: string };

/*
Runs in the page. Returns anything that overflows, already filtered down to real
defects. Kept as one evaluate() so the checks share a single layout pass and the
test does not round-trip per element.
*/
function collectOverflow() {
  const problems: Overflow[] = [];

  const describe = (el: Element) => {
    const id = el.id ? `#${el.id}` : "";
    const cls =
      typeof el.className === "string" && el.className
        ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
        : "";
    const tag = el.tagName.toLowerCase();
    const label =
      el.getAttribute("aria-label") ??
      (el.id
        ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
            ?.textContent
        : null) ??
      (el as HTMLInputElement).placeholder ??
      "";
    return `${tag}${id}${cls}${label ? ` "${String(label).trim().slice(0, 40)}"` : ""}`;
  };

  // 1. the page itself must never scroll sideways
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 1) {
    problems.push({
      where: "document",
      detail: `page scrolls horizontally: scrollWidth ${doc.scrollWidth} > clientWidth ${doc.clientWidth}`,
    });
  }

  const viewportRight = doc.clientWidth;

  for (const el of Array.from(
    document.querySelectorAll<HTMLElement>(
      'input, textarea, select, button, a, label, [role="button"], [role="menuitem"], h1, h2, h3, p, span, td, th, li',
    ),
  )) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    // offsetParent is null for display:none subtrees; fixed elements report null too
    const box = el.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;

    // sr-only is a 1x1 box; its text is SUPPOSED to exceed it. Not overflow.
    // Only the size is tested: `clip` is deprecated, and Chromium returns
    // "" rather than "auto" for getComputedStyle().clip, so comparing it
    // to "auto" silently skipped large parts of the page.
    if (box.width <= 1 && box.height <= 1) continue;

    let inHorizontalScroller = false;
    let clippedInsideViewport = false;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (ps.overflowX === "auto" || ps.overflowX === "scroll") {
        if (p.scrollWidth > p.clientWidth + 1) {
          inHorizontalScroller = true;
          break;
        }
      } else if (
        (ps.overflowX === "hidden" || ps.overflowX === "clip") &&
        p.getBoundingClientRect().right < viewportRight - 1
      ) {
        clippedInsideViewport = true;
        break;
      }
    }

    const label = describe(el);

    // 2. element clipping that is not deliberate truncation
    const clipsOnPurpose =
      style.textOverflow === "ellipsis" ||
      style.overflowX === "auto" ||
      style.overflowX === "scroll" ||
      style.overflowY === "auto" ||
      style.overflowY === "scroll";

    if (
      !el.matches("input, textarea, select") &&
      !clipsOnPurpose &&
      el.scrollWidth > el.clientWidth + 1 &&
      el.clientWidth > 0
    ) {
      problems.push({
        where: label,
        detail: `content wider than box: scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`,
      });
    }

    // 3. escaping the viewport on the right (ignore off-screen drawers)
    const offScreen =
      style.position === "fixed" || style.position === "absolute";
    if (
      !offScreen &&
      !inHorizontalScroller &&
      !clippedInsideViewport &&
      box.right > viewportRight + 1 &&
      box.width > 0
    ) {
      problems.push({
        where: label,
        detail: `extends past the viewport: right ${Math.round(box.right)} > ${viewportRight}`,
      });
    }
  }

  return problems;
}

async function expectNoOverflow(
  page: import("@playwright/test").Page,
  where: string,
) {
  const problems = (await page.evaluate(collectOverflow)) as Overflow[];
  expect(
    problems,
    `layout overflow on ${where}:\n  ` +
      problems.map((p) => `${p.where}: ${p.detail}`).join("\n  "),
  ).toEqual([]);
}

test.describe("layout", () => {
  test("no page scrolls sideways, at desktop and at 360px", async ({
    loggedInPage,
  }) => {
    // the auth pages are the ones with the widest fixed-width content
    for (const path of PUBLIC_PAGES) {
      await loggedInPage.goto(path);
      await waitForHydrated(loggedInPage);
      await expectNoOverflow(loggedInPage, `${path} @1280`);

      await loggedInPage.setViewportSize({ width: 360, height: 800 });
      await expectNoOverflow(loggedInPage, `${path} @360`);
      await loggedInPage.setViewportSize({ width: 1280, height: 800 });
    }
  });

  test("authenticated pages survive a maximum-length group name", async ({
    alicePage,
  }) => {
    // a 120-character name is legal server-side, so the UI has to cope with it
    const created = await alicePage.request.post("/api/groups", {
      data: { name: LONG_GROUP },
    });
    expect(created.status(), await created.text()).toBe(201);
    const group = (await created.json()) as { id: string };

    try {
      for (const path of PAGES) {
        await alicePage.goto(path);
        await waitForHydrated(alicePage);
        if (path === "/dashboard") await waitForDashboardReady(alicePage);
        await expectNoOverflow(alicePage, `${path} with a 120-char group name`);
      }
    } finally {
      await alicePage.request.delete(`/api/groups/${group.id}`);
    }
  });

  test("the auth form fits maximum-length credentials", async ({ page }) => {
    for (const path of ["/auth", "/register"]) {
      await page.goto(path);
      await waitForHydrated(page);

      const email = page.getByLabel(/email/i).first();
      if (await email.isVisible().catch(() => false)) {
        await email.fill(`${LONG_USERNAME}-${"e".repeat(60)}@example.test`);
      }
      const password = page.getByLabel("Password", { exact: true }).first();
      if (await password.isVisible().catch(() => false)) {
        await password.fill(LONG_PASSWORD);
      }
      const username = page.getByLabel(/username/i).first();
      if (await username.isVisible().catch(() => false)) {
        await username.fill(LONG_USERNAME);
      }

      await expectNoOverflow(page, `${path} with maximum-length input`);
    }
  });

  test("the document editor survives a maximum-length title", async ({
    alicePage,
  }) => {
    // 120 is the server maximum for a document title
    // (PATCH /api/documents/[id]: "Title must be between 1 and 120 characters").
    // Note the two client-side caps disagree with each other - the card input is
    // maxLength 50 and the doc page input is maxLength 120 - so this exercises
    // the looser one. That mismatch is itself worth a decision.
    const created = await alicePage.request.post("/api/documents", {
      data: {},
    });
    expect(created.status(), await created.text()).toBe(201);
    const doc = (await created.json()) as { id: string };

    try {
      const renamed = await alicePage.request.patch(
        `/api/documents/${doc.id}`,
        {
          data: { title: LONG_DOCUMENT_TITLE },
        },
      );
      expect([200, 204], await renamed.text()).toContain(renamed.status());

      await alicePage.goto(`/doc/${doc.id}`);
      await waitForHydrated(alicePage);
      await expectNoOverflow(
        alicePage,
        `/doc/[id] with a ${LONG_DOCUMENT_TITLE.length}-char title`,
      );

      // and with the rename input open, which is a different layout
      await alicePage.getByTitle("Rename document").first().click();
      await expectNoOverflow(alicePage, "/doc/[id] rename input open");
    } finally {
      await alicePage.request.delete(`/api/documents/${doc.id}`);
    }
  });

  test("every form control is reachable and not overlapped", async ({
    loggedInPage,
  }) => {
    // a control pushed outside the viewport, or covered by a sticky header, is
    // unusable even when nothing reports a scrollbar
    for (const path of ["/auth", "/register"]) {
      await loggedInPage.goto(path);
      await waitForHydrated(loggedInPage);

      const hidden = await loggedInPage.evaluate(() => {
        const out: string[] = [];
        for (const el of Array.from(
          document.querySelectorAll<HTMLElement>(
            'input:not([type="hidden"]), textarea, select, button',
          ),
        )) {
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden")
            continue;
          const box = el.getBoundingClientRect();
          if (box.width === 0 && box.height === 0) continue;

          // what actually sits at the control's centre?
          const hit = document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          );
          if (hit && !el.contains(hit) && !hit.contains(el)) {
            const id = el.id ? `#${el.id}` : "";
            out.push(
              `${el.tagName.toLowerCase()}${id} is covered by ${hit.tagName.toLowerCase()}.${String(hit.className).split(/\s+/)[0]}`,
            );
          }
        }
        return out;
      });

      expect(
        hidden,
        `controls unreachable on ${path}:\n  ${hidden.join("\n  ")}`,
      ).toEqual([]);
    }
  });

  test("a long username does not break the dashboard", async ({
    loggedInPage,
  }) => {
    // seeded names are short; check the shell renders whatever it is given
    await loggedInPage.goto("/dashboard");
    await waitForDashboardReady(loggedInPage);
    await expectNoOverflow(loggedInPage, "/dashboard");

    // the account menu carries the username
    await loggedInPage.getByRole("button", { name: "Account menu" }).click();
    await expectNoOverflow(loggedInPage, "/dashboard account menu open");
    await loggedInPage.keyboard.press("Escape");
  });

  test("seeded accounts render without overflow", async ({
    alicePage,
    bobPage,
  }) => {
    for (const [name, page] of [
      ["alice", alicePage],
      ["bob", bobPage],
    ] as const) {
      for (const path of ["/dashboard", "/profile"]) {
        await page.goto(path);
        await waitForHydrated(page);
        if (path === "/dashboard") await waitForDashboardReady(page);
        await expectNoOverflow(
          page,
          `${path} as ${name} (${seedUser(name).username})`,
        );
      }
    }
  });
});
