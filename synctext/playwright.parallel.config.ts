/*
Parallel runner for the multi-user requirements (subject.txt III.2
"Multi-user Support (Mandatory)").

Why a separate config instead of raising `workers` in playwright.config.ts:

  - the rest of the suite (01-09) shares one seeded database and one in-memory
    rate limiter (5 signups per hour per IP, 10 failed logins per 15 min per IP).
    Running those files side by side makes them fight over that shared state and
    they start failing for reasons that have nothing to do with the product.
  - the concurrency spec is deliberately written to be independent: each test
    owns a disjoint set of accounts and cleans up after itself.

Run it with:

    npx playwright test --config playwright.parallel.config.ts

Override the worker count if you want to push it harder:

    PW_WORKERS=8 npx playwright test --config playwright.parallel.config.ts

To include other specs in the parallel run, widen `testMatch` - but check that
they do not depend on being the only test touching the database or the limiter.
*/
import { defineConfig, devices } from "@playwright/test";

const workers = Number(process.env.PW_WORKERS ?? 4);

if (!Number.isInteger(workers) || workers < 2) {
  throw new Error(`PW_WORKERS must be an integer >= 2 (got ${process.env.PW_WORKERS})`);
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "11-concurrency.spec.ts",

  // the point of this config: real parallelism, in the runner AND inside the tests
  fullyParallel: true,
  workers,

  // race conditions are timing sensitive, so give slow concurrent work room
  timeout: 180_000,
  expect: { timeout: 20_000 },
  retries: 0,

  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-parallel" }]],

  use: {
    baseURL: process.env.BASE_URL || "https://localhost:8443",
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
