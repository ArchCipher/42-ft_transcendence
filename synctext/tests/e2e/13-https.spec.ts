/*
subject.txt III.3: "Any connection to the backend, from a browser, from a script,
from an external API, etc., must use HTTPS. Connections inside the backend
itself (e.g., web server and database, software inside your container(s)) can be
without encryption."

This spec checks the rule from both sides:

  A. What the BROWSER does  - every page is https, no plaintext request is ever
     issued, the collaboration socket is wss, and the session cookie is Secure so
     it can never travel in the clear.
  B. What the CODE does     - a static scan for http:// URLs in the source, with
     an allowlist for the container-internal hosts that the subject explicitly
     exempts (db, web, collab, mailpit, localhost).

Grounded facts (compose.yaml + services/nginx/conf.template):
  - nginx is the only published port: "8443:443", and its single server block
    listens on 443 ssl only. There is no :80 listener, so there is no plaintext
    way in.
  - the /collab location proxies the websocket on the same TLS listener, and the
    browser derives the socket URL from window.location -> wss on https.
  - inside the backend, plain http is expected and allowed:
    DATABASE_URL, COLLAB_INTERNAL_URL (http://collab:1234),
    WEB_INTERNAL_URL (http://web:3000), MAILPIT_URL (http://mailpit:8025).
*/
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { test, expect, seedUser } from "./fixtures/auth";
import { watchConsole } from "./utils/console-guard";
import { loginUserExpectSuccess, waitForDashboardReady, waitForHydrated } from "./utils/test-helpers";

/** Hosts that are allowed to speak plain http: everything inside the backend. */
const INTERNAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "db",
  "web",
  "nginx",
  "migrate",
  "collab",
  "mailpit",
  "guest-cleanup",
  "host.docker.internal",
]);

/*
Namespace URIs and documentation links are identifiers, not connections: nothing
is ever dialled. Every tiptap icon carries xmlns="http://www.w3.org/2000/svg",
so these have to be allowed or the scan drowns in false positives.
*/
const NOT_A_CONNECTION = new Set([
  "www.w3.org",
  "schema.org",
  "reactjs.org",
  "nextjs.org",
  "developer.mozilla.org",
  "github.com",
  "npmjs.com",
  "example.com",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "test-results",
  "playwright-report",
  ".playwright-browsers",
  "coverage",
  "dist",
  ".turbo",
]);

const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const repoRoots = () => {
  const configFile = test.info().config.configFile;
  const appRoot = configFile ? dirname(configFile) : process.cwd();
  const roots = [appRoot];
  // the monorepo root holds packages/db and services/*, which also make backend
  // calls and must obey the same rule
  const monorepo = dirname(appRoot);
  try {
    if (statSync(join(monorepo, "compose.yaml")).isFile()) roots.push(monorepo);
  } catch {
    // single-package checkout, nothing to add
  }
  return roots;
};

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (SCANNED_EXTENSIONS.has(extname(full))) found.push(full);
  }
  return found;
}

/*
Test files are excluded wholesale. A spec that asserts an open redirect is
refused has to name a hostile URL (tests/auth/05-login-redirect.test.ts uses
"http://evil.com/phish"), and this very file deliberately probes
"http://${base.host}/" to prove the plaintext port refuses to serve the app.
Neither string is ever dialled. Excluding only *.test.ts left this file scanning
itself, so every non-internal http:// literal in the tree showed up as a false
positive. Application code, compose files and services/ are still scanned in
full, and the runtime half of this spec still proves the browser only ever
speaks https.
*/
const isTestFile = (file: string) =>
  /(^|[\\/])tests?[\\/]/.test(file) || /\.test\.(ts|tsx|js|jsx)$/.test(file);

test.describe("III.3 everything outside the backend speaks HTTPS", () => {
  test("every page is served over https in a secure context", async ({ page }) => {
    for (const path of ["/", "/auth", "/register", "/dashboard", "/privacy", "/terms"]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} did not load`).toBeLessThan(400);

      expect(new URL(page.url()).protocol, `${path} was not https`).toBe("https:");
      expect(
        await page.evaluate(() => window.isSecureContext),
        `${path} is not a secure context`,
      ).toBe(true);
    }
  });

  test("the browser never issues a plaintext request", async ({ page }) => {
    test.setTimeout(90_000);
    const plaintext: string[] = [];

    page.on("request", (request) => {
      if (request.url().startsWith("http://")) plaintext.push(request.url());
    });

    await page.goto("/auth");
    await loginUserExpectSuccess(page, seedUser("alice"));
    await waitForDashboardReady(page);
    await waitForHydrated(page);
    await page.goto("/privacy");
    await page.goto("/dashboard");
    await waitForDashboardReady(page);

    expect(plaintext, "the browser talked plaintext http").toEqual([]);
  });

  test("the collaboration socket is wss", async ({ page }) => {
    test.setTimeout(90_000);
    const sockets: string[] = [];
    page.on("websocket", (socket) => sockets.push(socket.url()));

    await page.goto("/auth");
    await loginUserExpectSuccess(page, seedUser("alice"));
    await waitForDashboardReady(page);

    // open a document so the collaborative editor connects
    await page.getByRole("button", { name: "Create document" }).click();
    await page.waitForURL(/\/doc\//);
    await waitForHydrated(page);
    await page.waitForTimeout(2000); // give the provider time to dial in

    expect(sockets.length, "no websocket was opened from the editor").toBeGreaterThan(0);
    for (const url of sockets) {
      expect(new URL(url).protocol, `${url} is not a secure socket`).toBe("wss:");
    }
  });

  test("the session cookie is Secure, HttpOnly and Lax", async ({ page }) => {
    await page.goto("/auth");
    await loginUserExpectSuccess(page, seedUser("alice"));

    const cookies = await page.context().cookies();
    const session = cookies.find((cookie) => cookie.name === "session");
    expect(session, "no session cookie was set").toBeTruthy();

    // secure follows the real connection (lib/auth/cookie-https.ts); if this
    // fails, the cookie could be sent over plain http
    expect(session!.secure, "session cookie is not Secure").toBe(true);
    expect(session!.httpOnly, "session cookie is readable by JavaScript").toBe(true);
    expect(session!.sameSite).toBe("Lax");
  });

  test("plain http to the public port does not serve the app", async ({ request }) => {
    test.setTimeout(60_000);
    const base = new URL(test.info().project.use.baseURL as string);

    let servedOverPlaintext = false;
    try {
      const response = await request.get(`http://${base.host}/`, {
        timeout: 15_000,
        failOnStatusCode: false,
      });
      servedOverPlaintext = response.ok();
    } catch {
      // a TLS handshake failure is the expected outcome: port 443 only speaks TLS
      servedOverPlaintext = false;
    }

    expect(
      servedOverPlaintext,
      `http://${base.host}/ answered successfully; there must be no plaintext entry point`,
    ).toBe(false);
  });

  test("no source file points a backend call at a plaintext external host", () => {
    const offenders: string[] = [];
    // http:// followed by a host, then stop at the first path/port delimiter
    const pattern = /http:\/\/([^\s'"`)>\\/]+)/g;
    const seen = new Set<string>();

    for (const root of repoRoots()) {
      for (const file of sourceFiles(root)) {
        if (seen.has(file) || isTestFile(file)) continue;
        seen.add(file);

        const contents = readFileSync(file, "utf8");
        for (const match of contents.matchAll(pattern)) {
          const authority = match[1];
          const host = authority.split("/")[0].split(":")[0].toLowerCase();
          if (!INTERNAL_HOSTS.has(host) && !NOT_A_CONNECTION.has(host)) {
            offenders.push(`${file}: ${authority}`);
          }
        }
      }
    }

    expect(
      offenders,
      `plaintext backend URLs found (only ${[...INTERNAL_HOSTS].join(", ")} may use http):\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  test("the console stays clean while everything is https", async ({ page }) => {
    const console_ = watchConsole(page);

    await page.goto("/auth");
    await loginUserExpectSuccess(page, seedUser("alice"));
    await waitForDashboardReady(page);

    expect(console_.errors, console_.report()).toEqual([]);
    expect(console_.warnings, console_.report()).toEqual([]);
    expect(console_.pageErrors, console_.report()).toEqual([]);
  });
});
