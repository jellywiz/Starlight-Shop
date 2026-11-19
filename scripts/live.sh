#!/usr/bin/env bash
# Runs a maintainer command against the LIVE site (Supabase database + storage) using the
# credentials in .env.live, so connection strings never have to be typed into the terminal
# (and so never land in shell history).
#
#   bash scripts/live.sh [--confirm] [--backup] <command...>
#
# Normally called through the package scripts: pnpm migrate:live, pnpm backup:live, ...
#   --confirm  show the target and ask the maintainer to type "yes" first (changes data)
#   --backup   run ./scripts/backup.sh against the live site before the command
#
# Why .env.live and not .env.production: Next.js loads .env.production automatically for
# `next build` / `next start`, which would quietly point local production builds at the live
# database. Nothing loads .env.live except this script. It is git-ignored (.env.*).
set -euo pipefail

cd "$(dirname "$0")/.."

CONFIRM=0
BACKUP=0
while [ $# -gt 0 ]; do
  case "$1" in
    --confirm) CONFIRM=1; shift ;;
    --backup) BACKUP=1; shift ;;
    *) break ;;
  esac
done
if [ $# -eq 0 ]; then
  echo "usage: bash scripts/live.sh [--confirm] [--backup] <command...>" >&2
  exit 2
fi

ENV_FILE=".env.live"
if [ ! -f "$ENV_FILE" ]; then
  echo "$ENV_FILE not found. Copy .env.live.example to $ENV_FILE and fill it in" >&2
  echo "(step-by-step: docs/deployment.md, section \"Maintainer commands against the live site\")." >&2
  exit 1
fi

# Start from a clean slate for every variable the scripts read, so a value from the
# terminal or from the local .env can never mix with the live one.
unset DATABASE_URI DATABASE_MIGRATION_URI S3_ENDPOINT S3_REGION S3_BUCKET S3_ACCESS_KEY_ID \
  S3_SECRET_ACCESS_KEY MEDIA_PUBLIC_BASE_URL SITE_URL
set -a
# shellcheck disable=SC1090
. "./$ENV_FILE"
set +a

missing=""
for name in DATABASE_MIGRATION_URI S3_ENDPOINT S3_REGION S3_BUCKET S3_ACCESS_KEY_ID \
  S3_SECRET_ACCESS_KEY MEDIA_PUBLIC_BASE_URL; do
  if [ -z "${!name:-}" ]; then
    missing="$missing $name"
  fi
done
if [ -n "$missing" ]; then
  echo "$ENV_FILE is missing:$missing" >&2
  exit 1
fi

# Host and port only (never the password), for the confirmation and the log.
TARGET="$(printf '%s' "$DATABASE_MIGRATION_URI" | sed -E 's#^[a-z]+://([^@]*@)?([^/?]+).*#\2#')"
case "$TARGET" in
  127.0.0.1* | localhost* | "")
    echo "DATABASE_MIGRATION_URI in $ENV_FILE points at '$TARGET', not the live database." >&2
    exit 1
    ;;
esac

# Every script reads the migration connection; the runtime variable gets the same value so
# nothing can fall back to the local database from .env.
export DATABASE_URI="$DATABASE_MIGRATION_URI"
# Tells scripts/backup.sh not to re-read .env on top of these values.
export STARLIGHT_LIVE=1

echo "LIVE site: database $TARGET, bucket $S3_BUCKET"
echo "Command:   $*"
if [ "$CONFIRM" -eq 1 ]; then
  printf 'This changes the live site. Type yes to continue: '
  read -r answer
  if [ "$answer" != "yes" ]; then
    echo "Cancelled."
    exit 1
  fi
fi

if [ "$BACKUP" -eq 1 ]; then
  ./scripts/backup.sh
fi

exec "$@"
