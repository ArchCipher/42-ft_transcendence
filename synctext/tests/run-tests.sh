#!/bin/sh

set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

# Unit tests first, e2e second. They used to live in one script, but they have
# nothing in common: the auth tests are pure and need neither Docker nor a
# browser, while the e2e suite resets the database and restarts web. A unit
# failure says the e2e run that follows cannot pass, so running them together
# only wasted time.
#
#   tests/run-tests.sh          -> unit, then the whole e2e suite
#   tests/run-unit.sh           -> unit only
#   tests/run-e2e.sh            -> e2e only
#   tests/run-e2e.sh 05-groups  -> a single spec
#
# Anything passed to this script is forwarded to the e2e run, not the unit run.
"$SCRIPT_DIR/run-unit.sh"

exec "$SCRIPT_DIR/run-e2e.sh" "$@"
