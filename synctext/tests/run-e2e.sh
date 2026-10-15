#!/bin/sh

set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

# Playwright has to run from the directory that holds playwright.config.ts, so
# that the relative testMatch and tsconfig pathaliases resolve. Search upwards
# for it instead of counting hops: tests/ -> synctext is one level today, but a
# fixed "../.." style guess is what made db-state.sh read a compose file from
# the wrong directory. Being independent of the caller's cwd means this works
# the same from the repo root, from synctext/, or from anywhere else.
find_app_dir() {
  dir=$SCRIPT_DIR
  while :; do
    if [ -f "$dir/playwright.config.ts" ]; then
      printf '%s\n' "$dir"
      return 0
    fi
    if [ "$dir" = "/" ]; then
      return 1
    fi
    dir=$(dirname -- "$dir")
  done
}

APP_DIR=$(find_app_dir) || {
  echo "run-e2e: no playwright.config.ts above $SCRIPT_DIR" >&2
  exit 1
}

cd "$APP_DIR"

# E2E_SKIP_TYPECHECK=1 to skip while iterating on one spec.
if [ "${E2E_SKIP_TYPECHECK:-0}" != "1" ]; then
  npm run --silent typecheck
fi

# Mailpit is reached from the host, not from inside the compose network:
# `mailpit` only resolves as a docker service name. It is published on
# 127.0.0.1:8025 (compose.yaml). Override MAILPIT_HOST if your host port differs.
MAILPIT_URL=${MAILPIT_URL_OVERRIDE:-http://127.0.0.1:8025}

# Browsers are per-machine, install once with:
#   PLAYWRIGHT_BROWSERS_PATH="$APP_DIR/.playwright-browsers" npx playwright install chromium
#
# Sign-up quota is 5 accounts/hour/IP and lives in the web process memory:
#   docker compose restart web

# The database starts as seed-only and is left as seed-only, even when a test
# fails or the run is interrupted. db-state.sh finds compose.yaml by itself, so
# nothing here depends on the caller's working directory; --restart clears the
# in-memory rate limiters, which a truncate cannot, and then waits for web to be
# healthy again.
#
# After the run the database is reset again, and web is RESTARTED so nothing the
# suite did survives into manual testing. --restart matters: a plain `reset` only
# truncates, and web's rate limiters (sign-up, login, password reset) live in
# process memory, not in the database. 99-rate-limit.spec.ts deliberately burns
# those budgets, so without a restart the next manual sign-up or login can come
# back 429 or 423 from a test that already finished. The restart also drops any
# half-finished collaborative document state held by the web process.
#
# E2E_SKIP_DB_RESET=1 keeps the current data, e.g. while writing a test that has
# to inspect state a previous run left behind.
if [ "${E2E_SKIP_DB_RESET:-0}" != "1" ]; then
  "$SCRIPT_DIR/db-state.sh" reset --restart

  # armed only once the first reset succeeded, so a failed reset cannot be
  # followed by a second one that hides the cause
  # --restart here too, for the reason above: leaving web un-restarted is what
  # made a manual login after a run fail on a spent limiter.
  trap '"$SCRIPT_DIR/db-state.sh" reset --restart >/dev/null 2>&1 || true' EXIT INT TERM
fi

# Playwright ORs its positional arguments together as path filters, so always
# appending tests/e2e/ alongside a caller's filter would match the whole
# directory and silently defeat single-spec runs. Only pin the directory when
# no filter was given.
#
#   tests/run-e2e.sh                          -> whole suite
#   tests/run-e2e.sh 05-groups                -> that one spec
#   tests/run-e2e.sh -g "accepts"             -> one test by title
#   tests/run-e2e.sh --headed                 -> watch it run
set -- "$@"
if [ "$#" -eq 0 ]; then
  set -- tests/e2e/
fi

BASE_URL=${BASE_URL:-https://localhost:8443} \
PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-$APP_DIR/.playwright-browsers} \
MAILPIT_URL="$MAILPIT_URL" \
  npx playwright test --config ./playwright.config.ts "$@"
