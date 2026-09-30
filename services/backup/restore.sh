#!/bin/sh

usage() {
  echo "Usage: restore.sh [validate|restore] <backup-file>" >&2
  exit 2
}

action="${1:-}"
backup_name="${2:-}"

case "${action}" in
  validate|restore)
    ;;
  *)
    usage
    ;;
esac

case "${backup_name}" in
  *.dump)
    ;;
  *)
    echo "backup must be a .dump filename" >&2
    exit 2
    ;;
esac

case "${backup_name}" in
  */*)
    echo "backup must be a filename, not a path" >&2
    exit 2
    ;;
esac

backup="/backups/${backup_name}"

validate_backup() {
  if [ ! -f "${backup}" ]; then
    echo "backup not found: ${backup_name}" >&2
    exit 1
  fi

  if ! pg_restore --list "${backup}" >/dev/null 2>&1; then
    echo "invalid PostgreSQL backup: ${backup_name}" >&2
    exit 1
  fi
}

validate_backup

if [ "${action}" = "validate" ]; then
  echo "backup is valid: ${backup_name}"
  exit 0
fi

database="${PGDATABASE:-}"

if [ -z "${database}" ]; then
  echo "PGDATABASE is not configured" >&2
  exit 1
fi

case "${database}" in
  postgres|template0|template1)
    echo "refusing to restore protected database: ${database}" >&2
    exit 1
    ;;
esac

echo "restoring database ${database} from ${backup_name}"

if ! dropdb   --maintenance-db=postgres   --if-exists   --force   "${database}"
then
  echo "could not remove existing database" >&2
  exit 1
fi

if ! createdb   --maintenance-db=postgres   "${database}"
then
  echo "could not create database" >&2
  exit 1
fi

if ! pg_restore   --exit-on-error   --no-owner   --no-privileges   --dbname="${database}"   "${backup}"
then
  echo "database restore failed" >&2
  exit 1
fi

table_count="$(
  psql     --dbname="${database}"     --tuples-only     --no-align     --command="
      SELECT count(*)
      FROM pg_tables
      WHERE schemaname = 'public';
    "
)"

if [ $? -ne 0 ] || [ "${table_count:-0}" -eq 0 ]; then
  echo "restored database validation failed" >&2
  exit 1
fi

echo "database restore complete"
echo "public tables restored: ${table_count}"
