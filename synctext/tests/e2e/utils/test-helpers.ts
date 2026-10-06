import { Page, expect, type Response } from "@playwright/test";

// Mailpit is published on the host at 127.0.0.1:8025 (compose.yaml). Inside the
// compose network it is http://mailpit:8025 - this helper runs on the test
// runner, not in the container, so default to the published port.
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";

// Routes / labels verified against the app:
//   login page  -> /auth          (app/auth/page.tsx, submit button "Login")
//   register    -> /register      (redirects to /auth?verify=pending)
//   logout      -> /api/auth/logout (GET redirects to /auth?verify=logged-out)
//   unauthed    -> redirected to /auth  (lib/auth/guard.ts:22)
export const ROUTES = {
  auth: "/auth",
  register: "/register",
  forgotPassword: "/forgot-password",
  passwordReset: "/password-reset",
  verifyPending: "/auth?verify=pending",
  verifyEmail: "/verify-email",
  dashboard: "/dashboard",
  logout: "/api/auth/logout",
} as const;

/*
Wait for the response of a form submit, so a rejected request reports the
server's status and message instead of timing out on waitForURL.
*/
/*
A route can fail with Next's HTML error page instead of the JSON error envelope.
response.json() then rejects, the catch above swallowed it, and the test reported
status 500 with error "undefined" - which is how a register 500 turned into an
unreadable failure that needed container logs to diagnose. Read the body as text
first and only parse when it really is JSON, so the assertion message always
carries something the developer can act on.
*/
async function readError(response: Response): Promise<string | undefined> {
  const text = await response.text().catch(() => "");
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as { error?: string };
    return parsed.error ?? text.slice(0, 200);
  } catch {
    // not JSON: an HTML error page or a proxy's plaintext failure
    return text.slice(0, 200);
  }
}

async function submitAndCapture(
  page: Page,
  endpoint: string,
  click: () => Promise<void>,
) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(endpoint) && r.request().method() !== "OPTIONS",
    ),
    click(),
  ]);
  return { status: response.status(), error: await readError(response) };
}

/*
Registers and returns the API outcome instead of asserting it: the duplicate
checks expect 409, the happy path expects 201, so the caller decides.
*/
export async function registerUser(
  page: Page,
  user: { email: string; username: string; password: string },
) {
  await page.goto(ROUTES.register);
  await waitForHydrated(page);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/username/i).fill(user.username);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByLabel(/confirm password/i).fill(user.password);

  // 201 created, 409 email/username taken, 400 validation, 429 sign-up quota
  // (5/hour/IP, in-memory per process - restart the web container to clear it).
  return submitAndCapture(page, "/api/auth/register", () =>
    page.getByRole("button", { name: /^register(ing\.\.\.)?$/i }).click(),
  );
}

// For the happy path only: asserts the account was created and the notice shown.
export async function registerUserExpectSuccess(
  page: Page,
  user: { email: string; username: string; password: string },
) {
  const result = await registerUser(page, user);
  expect(
    result.status,
    `/api/auth/register responded ${result.status}: ${result.error}`,
  ).toBe(201);
  await page.waitForURL(/\/auth\?verify=pending/);
}

/*
Logs in and returns the API outcome instead of asserting it: several tests
expect a refusal (401 wrong password, 403 unverified email, 429 rate limited),
so the caller decides what is acceptable.
*/
export async function loginUser(
  page: Page,
  user: { email: string; username?: string; password: string },
) {
  await page.goto(ROUTES.auth);
  await waitForHydrated(page);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);

  // 200 issued, 401 bad credentials, 403 unverified email, 429 rate limited
  return submitAndCapture(page, "/api/auth/login", () =>
    page.getByRole("button", { name: /^login$/i }).click(),
  );
}

// For the happy path only: asserts the session was issued and redirects.
export async function loginUserExpectSuccess(
  page: Page,
  user: { email: string; username?: string; password: string },
) {
  const result = await loginUser(page, user);
  expect(
    result.status,
    `/api/auth/login responded ${result.status}: ${result.error}`,
  ).toBe(200);
  await page.waitForURL(new RegExp(ROUTES.dashboard));
  await waitForDashboardReady(page);
}

export async function logout(page: Page) {
  await page.goto(ROUTES.logout);
  await page.waitForURL(/\/auth\?verify=logged-out/);
}

export function makeUser(prefix: string = "test") {
  // usernameSchema is /^[a-zA-Z0-9_]+$/ with max 32 (lib/auth/validation.ts:60),
  // so the id must not contain "-" and must stay short.
  const id = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    email: `${id.replace(/_/g, "-")}@example.com`,
    username: id.slice(0, 32),
    password: "TestPass123!",
  };
}

type MailpitMessage = {
  ID: string;
  To?: { Address: string }[];
  Subject?: string;
};
type MailpitMessageDetail = { HTML?: string; Text?: string; Subject?: string };

async function mailpitMessages(): Promise<MailpitMessage[]> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=200`);
  if (!res.ok)
    throw new Error(
      `Mailpit list failed: ${res.status} (is mailpit up at ${MAILPIT_URL}?)`,
    );
  const body = (await res.json()) as { messages?: MailpitMessage[] };
  return body.messages ?? [];
}

function extractLink(body: string, path: string): string | undefined {
  const match = body.match(
    new RegExp(`https?://[^\\s"'<>]*${path}\\?token=[^\\s"'<>&]+`),
  );
  return match?.[0].replace(/&amp;/g, "&");
}

async function fetchMail(
  page: Page,
  email: string,
  predicate: (message: MailpitMessage) => boolean,
  timeoutMs: number,
): Promise<MailpitMessageDetail> {
  const deadline = Date.now() + timeoutMs;
  let messageId: string | undefined;

  while (Date.now() < deadline) {
    const messages = await mailpitMessages();
    messageId = messages
      .filter((m) =>
        m.To?.some((t) => t.Address?.toLowerCase() === email.toLowerCase()),
      )
      .filter(predicate)
      .sort((a, b) => b.ID.localeCompare(a.ID))[0]?.ID;
    if (messageId) break;
    await page.waitForTimeout(250);
  }

  if (!messageId)
    throw new Error(`No matching Mailpit message delivered to ${email}`);

  const detailRes = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`);
  if (!detailRes.ok)
    throw new Error(`Mailpit message fetch failed: ${detailRes.status}`);
  return (await detailRes.json()) as MailpitMessageDetail;
}

/*
Registration issues no session (app/api/auth/register/route.ts): the account must
be verified by clicking the link Mailpit captured, then the user logs in.
Poll Mailpit until the mail arrives, extract /verify-email?token=..., visit it.
*/
export async function verifyEmail(
  page: Page,
  email: string,
  timeoutMs = 15_000,
) {
  // Subject is "Verify your email" (lib/auth/email.ts:88) so a password reset mail
  // that arrived earlier is never mistaken for the verification one.
  const detail = await fetchMail(
    page,
    email,
    (m) => m.Subject === "Verify your email",
    timeoutMs,
  );

  const link =
    extractLink(detail.HTML ?? "", ROUTES.verifyEmail) ??
    extractLink(detail.Text ?? "", ROUTES.verifyEmail);
  if (!link)
    throw new Error(`No ${ROUTES.verifyEmail} link in message for ${email}`);

  await page.goto(link);
  await page.waitForURL(new RegExp(ROUTES.verifyEmail));
  await expect(page.getByText(/your email is confirmed/i)).toBeVisible();
}

// /forgot-password -> Mailpit -> /password-reset?token=... -> new password.
export async function requestPasswordReset(
  page: Page,
  email: string,
  newPassword: string,
) {
  await page.goto(ROUTES.forgotPassword);
  await waitForHydrated(page);
  await page.getByLabel(/email/i).fill(email);
  await page
    .getByRole("button", { name: /send password reset email/i })
    .click();
  await page.waitForURL(/\/auth\?verify=reset-sent/);

  const detail = await fetchMail(
    page,
    email,
    (m) => m.Subject === "Reset your password",
    15_000,
  );

  const link =
    extractLink(detail.HTML ?? "", ROUTES.passwordReset) ??
    extractLink(detail.Text ?? "", ROUTES.passwordReset);
  if (!link)
    throw new Error(`No ${ROUTES.passwordReset} link in message for ${email}`);

  await page.goto(link);
  await page.waitForURL(new RegExp(ROUTES.passwordReset));
  await waitForHydrated(page);
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByLabel(/confirm password/i).fill(newPassword);
  await page
    .getByRole("button", { name: /^reset(ting)? password(ing\.\.\.)?$/i })
    .click();
  await page.waitForURL(/\/auth\?verify=reset-done/);
}

// Register -> verify via Mailpit -> log in -> land on the dashboard.
export async function registerAndLogin(
  page: Page,
  user: { email: string; username: string; password: string },
) {
  await registerUserExpectSuccess(page, user);
  await verifyEmail(page, user.email);
  await loginUserExpectSuccess(page, user);
}

export async function waitForDashboardReady(page: Page) {
  await waitForHydrated(page);
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("button", { name: /create document/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Groups$/ })).toBeVisible();
}

/*
`page.goto('/dashboard')` resolves as soon as the server-rendered HTML is parsed.
React hydrates a beat later, so a click issued in between lands on inert markup:
Playwright reports the click as successful, React never sees it, and whatever the
click was supposed to open (a dialog, a menu, a save) simply never appears.

Use this instead of a bare goto for any page you are about to interact with.
Same idea for the document page, which hydrates from its own client fetch.
*/

export async function gotoDashboard(page: Page) {
  await page.goto("/dashboard");
  await waitForDashboardReady(page);
}

export async function gotoDocument(page: Page, id: string) {
  await page.goto(`/doc/${encodeURIComponent(id)}`);
  await waitForHydrated(page);
  await page.waitForLoadState("networkidle");
}

export async function startDocRename(page: Page) {
  await page.getByTitle("Rename document").click();
  const input = page.getByLabel("Document title", {exact: true});
  await expect(input).toBeFocused();
  return input;
}

export async function waitForHydrated(page: Page) {
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll("button, input, a[href]")).some(
        (el) => Object.keys(el).some((k) => k.startsWith("__reactFiber$")),
      ),
    undefined,
    { timeout: 10_000 },
  );
}
