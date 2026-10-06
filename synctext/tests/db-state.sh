#!/usr/bin/env bash
# Database reset for the e2e suite: truncate every table except the migration
# history, then re-run the Prisma seed. Afterwards the database holds nothing
# but packages/db/prisma/seed.ts, so a run both starts from and leaves behind a
# known state.
#
#   db-state.sh reset            wipe + seed
#   db-state.sh reset --restart  also restart web and wait for it to be healthy
#   db-state.sh summary          per-table row counts
#   db-state.sh services         what compose calls each service here
#   db-state.sh restart
#   db-state.sh internal-post
#
# The --restart flag is what a test run needs before it starts: the sign-up and
# login limiters live in the web process memory (5 signups per hour per IP, 10
# failed logins per 15 min, synctext/lib/auth/rate-limit.ts) and wiping rows
# does not clear them, so without the restart a second run in the same hour gets
# 429s even against a freshly seeded database. 17-resend-verification calls
# `restart` mid-suite, after the earlier specs have spent the sign-up quota.
#
# Everything goes through Docker on purpose. This script reads no credentials:
# psql and the seed run in containers that already have DATABASE_URL and
# POSTGRES_* in their environment. compose.yaml loads a .env from the project
# directory for that, and the script never has to know what is in it.
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)

# The compose project directory is the nearest ancestor of this script that
# holds a compose file. It used to be hardcoded as "$SCRIPT_DIR/../../..", which
# overshoots by one level: tests -> synctext -> <repo> is two hops, not three,
# so compose was run one directory above the repo, where it happily loaded some
# other project's compose file and answered "no such service: db".
#
# Searching upwards instead of counting hops makes this independent of how deep
# tests/ happens to sit, and independent of the caller's working directory.
find_project_dir() {
  dir=$SCRIPT_DIR
  while :; do
    for name in compose.yaml compose.yml docker-compose.yaml docker-compose.yml; do
      if [ -f "$dir/$name" ]; then
        printf '%s\n' "$dir"
        return 0
      fi
    done
    if [ "$dir" = "/" ]; then
      return 1
    fi
    dir=$(dirname -- "$dir")
  done
}

PROJECT_DIR=$(find_project_dir) || {
  echo "db-state: no compose.yaml in any directory above $SCRIPT_DIR." >&2
  echo "db-state: run this from a checkout, or set COMPOSE_FILE." >&2
  exit 1
}

cd "$PROJECT_DIR"

# Compose service names are discovered, not assumed: different checkouts of this
# project name the same container differently, and a hardcoded "db" fails with
# compose's own "no such service: db", which says nothing useful about the cause.
#
# resolve_service <override> <preferred name> <image substring>
#   1. the override, when given, always wins: DB_SERVICE / MIGRATE_SERVICE /
#      WEB_SERVICE
#   2. a service with the preferred name
#   3. otherwise, for the database, whichever running service uses a postgres
#      image - `docker compose ps` prints SERVICE first, IMAGE second
resolve_service() {
  override=$1
  preferred=$2
  image_hint=$3

  if [ -n "$override" ]; then
    printf '%s\n' "$override"
    return 0
  fi

  services=$(docker compose config --services) || return 1

  if [ -n "$preferred" ] && printf '%s\n' "$services" | grep -qx "$preferred"; then
    printf '%s\n' "$preferred"
    return 0
  fi

  if [ -n "$image_hint" ]; then
    found=$(docker compose ps 2>/dev/null | awk -v hint="$image_hint" \
      'NR > 1 && tolower($2) ~ tolower(hint) { print $1; exit }')
    if [ -n "$found" ]; then
      printf '%s\n' "$found"
      return 0
    fi
  fi

  return 1
}

service_list() {
  docker compose config --services 2>/dev/null | tr '\n' ' '
}

# Which project and which config file compose is actually using. Printed on
# every failure because "no such service: db" almost always means compose loaded
# some other file: a COMPOSE_FILE pointing elsewhere, or a directory that is not
# the compose project directory.
config_report() {
  echo "db-state: compose project directory: $PROJECT_DIR" >&2
  echo "db-state: COMPOSE_FILE=${COMPOSE_FILE:-<unset>}" >&2
  echo "db-state: docker compose ls:" >&2
  docker compose ls >&2 2>/dev/null ||
    echo "db-state:   (could not be listed)" >&2
}

# Compose reports its own errors on stderr; never swallow them, or a config
# problem reads as "the database is not running".
require_running() {
  if ! container=$(docker compose ps -q "$1"); then
    echo "db-state: 'docker compose ps -q $1' failed, so the state of '$1'" >&2
    echo "db-state: is unknown. Compose printed the reason above." >&2
    exit 1
  fi
  if [ -z "$container" ]; then
    echo "db-state: service '$1' has no running container." >&2
    echo "db-state: services in this project: $(service_list)" >&2
    config_report
    exit 1
  fi
}

# Every public table except the migration history, discovered at run time so a
# schema change needs no matching edit here. CASCADE clears the child rows
# (friendships, members, sessions) too.
truncate_all() {
  cat <<'SQL'
DO $do$
DECLARE
  tables text;
BEGIN
  SELECT string_agg(format('%I', tablename), ', ') INTO tables
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';
  IF tables IS NOT NULL THEN
    EXECUTE format('TRUNCATE TABLE %s RESTART IDENTITY CASCADE', tables);
  END IF;
END
$do$;
SQL
}

# The migrate service is the only one with the seed sources plus tsx and the
# prisma CLI; the web image is a production standalone build and has neither.
# It also already carries a DATABASE_URL pointing at the database, whatever
# that service happens to be called here.
resolve_migrate() {
  resolve_service "${MIGRATE_SERVICE:-}" migrate '' ||
    {
      echo "db-state: found no service to run the seed with." >&2
      echo "db-state: services in this project: $(service_list)" >&2
      config_report
      echo "db-state: set MIGRATE_SERVICE=<name> to name it explicitly." >&2
      exit 1
    }
}

resolve_db() {
  resolve_service "${DB_SERVICE:-}" db postgres ||
    {
      echo "db-state: found no database service." >&2
      echo "db-state: services in this project: $(service_list)" >&2
      config_report
      echo "db-state: set DB_SERVICE=<name> to name it explicitly." >&2
      exit 1
    }
}

wait_for_web() {
  status=missing
  attempt=1
  while [ "$attempt" -le 60 ]; do
    status=$(docker inspect --format \
      '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "$(docker compose ps -q "$1" 2>/dev/null)" 2>/dev/null || echo missing)
    if [ "$status" = "healthy" ]; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  echo "db-state: $1 never became healthy (last status: $status)" >&2
  return 1
}

# Restarting web is the only way to clear the in-memory rate limiters; the
# database stays untouched, so rows other specs created mid-run survive.
restart_web() {
  WEB_SVC=$(resolve_service "${WEB_SERVICE:-}" web '')
  require_running "$WEB_SVC"
  echo "db-state: restarting '$WEB_SVC' to clear the rate limiters"
  docker compose restart "$WEB_SVC"
  wait_for_web "$WEB_SVC"
}

case "${1:-}" in
  services)
    echo "db-state: project directory $PROJECT_DIR"
    echo "db-state: services: $(service_list)"
    echo "db-state: database: $(resolve_db)"
    echo "db-state: seed:     $(resolve_migrate)"
    if [ -n "$(resolve_service "${WEB_SERVICE:-}" web '' || true)" ]; then
      echo "db-state: web:      $(resolve_service "${WEB_SERVICE:-}" web '')"
    fi
    ;;

  # Regenerates the Prisma client. `reset` no longer does this, so run this once
  # after editing packages/db/prisma/schema.prisma - the seed queries the
  # generated client, so a stale one fails with a confusing missing-field error
  # rather than anything mentioning generate.
  prepare)
    MIGRATE_SVC=$(resolve_migrate)
    require_running "$MIGRATE_SVC"
    echo "db-state: regenerating the Prisma client via '$MIGRATE_SVC'"
    docker compose run --rm "$MIGRATE_SVC" npx prisma generate
    echo "db-state: client regenerated"
    ;;

  reset)
    DB_SVC=$(resolve_db)
    require_running "$DB_SVC"
    echo "db-state: using compose service '$DB_SVC' as the database"

    MIGRATE_SVC=$(resolve_migrate)
    echo "db-state: using compose service '$MIGRATE_SVC' to run the seed"

    # TRUNCATE needs an ACCESS EXCLUSIVE lock, which the app's connection pool
    # can hold while it serves a request, so allow a few attempts. ON_ERROR_STOP
    # makes psql exit non-zero, which set -e turns into a hard failure.
    attempt=1
    while :; do
      if truncate_all | docker compose exec -T "$DB_SVC" sh -c \
        'psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f -'; then
        break
      fi
      if [ "$attempt" -ge 5 ]; then
        echo "db-state: TRUNCATE failed $attempt times" >&2
        exit 1
      fi
      attempt=$((attempt + 1))
      sleep 1
    done
    echo "db-state: tables truncated, migration history kept"

    # No --no-deps: the database must be up, and compose waits for its healthcheck.
    echo "db-state: re-seeding (prisma generate + packages/db/prisma/seed.ts)"
    docker compose run --rm "$MIGRATE_SVC" sh -c \
        'npx prisma generate && npx tsx prisma/seed.ts'

    if [ "${2:-}" = "--restart" ]; then
      restart_web
    fi

    echo "db-state: done, the database holds only the seed"
    ;;

  restart)
    restart_web
    echo "db-state: web restarted, the rate limiters are empty"
    ;;

  # One POST to an /api/internal/* route from inside the backend network. nginx
  # answers 404 for these on the public internet
  internal-post)
    path=${2:-}
    case "$path" in
      /api/internal/*) ;;
      *)
        echo "db-state: internal-post wants an /api/internal/* path, got '$path'" >&2
        exit 64
        ;;
    esac
    COLLAB_SVC=$(resolve_service "${COLLAB_SERVICE:-}" collab '')
    require_running "$COLLAB_SVC"
    docker compose exec -T "$COLLAB_SVC" node -e "
      fetch(process.env.WEB_INTERNAL_URL + '$path', {
        method: 'POST',
        headers: { 'x-internal-service-token': process.env.INTERNAL_SERVICE_TOKEN || '' },
        body: '',
      })
        .then(async (res) => { console.log('HTTPSTATUS ' + res.status); console.log(await res.text()); })
        .catch((err) => { console.error(err); process.exit(1); });"
    ;;

  summary)
    DB_SVC=$(resolve_db)
    require_running "$DB_SVC"
    # n_live_tup is an estimate, but it needs no table names hardcoded
    docker compose exec -T "$DB_SVC" sh -c \
      'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT relname || '"'"' '"'"' || n_live_tup FROM pg_stat_user_tables ORDER BY relname"'
    ;;

  *)
    echo "usage: $0 prepare | $0 reset [--restart] | $0 restart | $0 internal-post <path> | $0 summary | $0 services" >&2
    exit 64
    ;;
esac
