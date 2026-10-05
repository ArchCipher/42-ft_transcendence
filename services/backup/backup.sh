#!/bin/sh

remove_old_backups() {
  retention="${BACKUP_RETENTION_COUNT:-7}"
  count=0

  for backup in $(ls -1t /backups/*.dump 2>/dev/null); do
    count=$((count + 1))

    if [ "${count}" -gt "${retention}" ]; then
      echo "removing old backup: ${backup}"
      rm -f "${backup}"
    fi
  done
}

backup_once() {
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  database="${PGDATABASE:-synctext}"
  final="/backups/${database}-${timestamp}.dump"
  temporary="${final}.tmp"

  echo "creating database backup: ${final}"
  rm -f "${temporary}"

  if pg_dump --format=custom --file="${temporary}"; then
    mv "${temporary}" "${final}"
    echo "database backup complete: ${final}"
    remove_old_backups
    return 0
  fi

  rm -f "${temporary}"
  echo "database backup failed" >&2
  return 1
}

list_backups() {
  if ! ls -lh /backups/*.dump 2>/dev/null; then
    echo "no backups found"
  fi
}

case "${1:-loop}" in
  once)
    backup_once
    ;;

  list)
    list_backups
    ;;

  loop)
    interval="${BACKUP_INTERVAL_SECONDS:-86400}"

    while true; do
      backup_once || true
      sleep "${interval}"
    done
    ;;

  *)
    echo "Usage: backup.sh [once|list|loop]" >&2
    exit 2
    ;;
esac
