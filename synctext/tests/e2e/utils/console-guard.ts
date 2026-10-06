/*
Shared helper for the "no warnings or errors in the browser console" requirement
(subject.txt III.2: "No warnings or errors should appear in the browser console").

Design notes:

- The guard is ATTACHED FIRST, before the first navigation, otherwise early boot
  messages (hydration warnings, failed preloads) are missed.
- It collects FOUR independent signals, because "no console errors" in practice
  means all four of them:
    1. console messages of type "error"    -> real script errors
    2. console messages of type "warning" -> React dev warnings, deprecations
    3. "pageerror"                         -> uncaught exceptions
    4. failed requests / >=400 responses   -> collected for TRIAGE only, because
       the app makes deliberate 4xx calls (e.g. a poll that 404s while a document
       is being created) and those are not console errors.
- There is deliberately NO permissive allowlist. Anything that needs to be
  tolerated must be added to `ALLOWED_SUBSTRINGS` with a comment explaining why,
  so the exception is reviewable instead of silently hiding a real warning.
*/
import type { Page } from "@playwright/test";

export type ConsoleVerdict = {
  errors: string[];
  warnings: string[];
  pageErrors: string[];
  failedRequests: string[];
  badResponses: string[];
};

export type ConsoleGuard = ConsoleVerdict & {
  /** Human-readable dump, used as the assertion message so a failure explains itself. */
  report: () => string;
  /** Forget everything collected so far (use between phases of one test). */
  reset: () => void;
  /** Detach every listener again. */
  stop: () => void;
};

/*
Empty on purpose. Add an entry only for output that is provably not the
application's fault, e.g. a browser-extension message. Substring match, case
insensitive. Do NOT add React warnings here: fixing them is the point of the
requirement.
*/
const ALLOWED_SUBSTRINGS: string[] = [];

const noise = (text: string) => {
  const lower = text.toLowerCase();
  return ALLOWED_SUBSTRINGS.some((allowed) => lower.includes(allowed.toLowerCase()));
};

const where = (page: Page) => {
  try {
    return page.url();
  } catch {
    return "<no url>";
  }
};

/**
 * Start recording console output, uncaught exceptions and network problems for
 * one page. Call before the first `goto`.
 */
export function watchConsole(page: Page): ConsoleGuard {
  const verdict: ConsoleVerdict = {
    errors: [],
    warnings: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  };

  const onMessage = (message: { type: () => string; text: () => string }) => {
    const type = message.type();
    const text = message.text();

    if (noise(text)) return;

    const line = `[${type}] ${text} (${where(page)})`;

    if (type === "error") verdict.errors.push(line);
    else if (type === "warning") verdict.warnings.push(line);
  };

  const onPageError = (error: Error) => {
    if (!noise(error.message)) {
      verdict.pageErrors.push(`[uncaught] ${error.message} (${where(page)})`);
    }
  };

  const onRequestFailed = (request: { url: () => string; method: () => string; failure: () => { errorText: string } | null }) => {
    const failure = request.failure();
    const line = `${request.method()} ${request.url()} -> ${failure?.errorText ?? "unknown"}`;
    if (!noise(line)) verdict.failedRequests.push(line);
  };

  const onResponse = (response: { url: () => string; status: () => number; request: () => { method: () => string } }) => {
    if (response.status() >= 400) {
      const line = `${response.request().method()} ${response.url()} -> ${response.status()}`;
      if (!noise(line)) verdict.badResponses.push(line);
    }
  };

  page.on("console", onMessage);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  return {
    ...verdict,
    report: () => {
      const section = (title: string, lines: string[]) =>
        lines.length === 0
          ? `  ${title}: none`
          : `  ${title}:\n${lines.map((line) => `    - ${line}`).join("\n")}`;

      return [
        "Browser console was not clean:",
        section("console.error", verdict.errors),
        section("console.warning", verdict.warnings),
        section("uncaught exceptions", verdict.pageErrors),
        section("failed requests (diagnostic)", verdict.failedRequests),
        section("responses >=400 (diagnostic)", verdict.badResponses),
      ].join("\n");
    },
    reset: () => {
      verdict.errors.length = 0;
      verdict.warnings.length = 0;
      verdict.pageErrors.length = 0;
      verdict.failedRequests.length = 0;
      verdict.badResponses.length = 0;
    },
    stop: () => {
      page.off("console", onMessage);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
      page.off("response", onResponse);
    },
  };
}

/** Assertion message helper: only the noisy sections, for a compact failure. */
export function consoleReport(guard: ConsoleGuard): string {
  return guard.report();
}
