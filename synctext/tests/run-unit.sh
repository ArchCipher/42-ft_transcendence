#!/bin/sh

set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

# Same upwards search as run-e2e.sh: vitest.config.mts lives next to
# playwright.config.ts, and the vitest include pattern is relative to it.
find_app_dir() {
  dir=$SCRIPT_DIR
  while :; do
    if [ -f "$dir/vitest.config.mts" ]; then
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
  echo "run-unit: no vitest.config.mts above $SCRIPT_DIR" >&2
  exit 1
}

cd "$APP_DIR"

if [ "${UNIT_SKIP_TYPECHECK:-0}" != "1" ]; then
  npm run --silent typecheck
fi

# The auth tests assert the cookie `secure` flag, which depends on NODE_ENV=test.
# These are pure unit tests: no Docker, no database, no browser. Anything after
# a failure here would be a wasted e2e run, which is why run-tests.sh calls this
# script first.
#
# NODE_ENV=test ... npx vitest run tests/auth/10-session.test.ts   -> one file
NODE_ENV=test npx vitest run "$@"
