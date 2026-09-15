#!/usr/bin/env bash
# Database + storage backup (spec section 12). Run after editing sessions and before
# migrations. Requires the PostgreSQL client tools (macOS: `brew install libpq` and add
# it to PATH, or use `supabase db dump`) and the maintainer's .env with
# DATABASE_MIGRATION_URI and the S3_* values.
#
#   ./scripts/backup.sh                # writes backups/<timestamp>/{db.dump,storage/}
#
# Keep the backups folder OUTSIDE the repository (it is git-ignored) in an encrypted,
# owner-controlled location. Retain the last seven session backups plus a monthly copy.
set -euo pipefail

cd "$(dirname "$0")/.."
if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
fi

DB_URI="${DATABASE_MIGRATION_URI:-${DATABASE_URI:-}}"
if [ -z "$DB_URI" ]; then
  echo "DATABASE_MIGRATION_URI (or DATABASE_URI) must be set" >&2
  exit 1
fi
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. macOS: brew install libpq && echo 'export PATH=\"/opt/homebrew/opt/libpq/bin:\$PATH\"' >> ~/.zshrc" >&2
  exit 1
fi

STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
TARGET="backups/$STAMP"
mkdir -p "$TARGET"

echo "Dumping schema starlight to $TARGET/db.dump ..."
pg_dump --format=custom --no-owner --no-privileges --schema=starlight --file="$TARGET/db.dump" "$DB_URI"

if [ -n "${S3_BUCKET:-}" ]; then
  echo "Copying storage objects ..."
  pnpm --silent backup:storage "$TARGET/storage"
else
  echo "S3_BUCKET not set: skipping storage copy (local media folder is used instead)."
  if [ -d media ]; then
    cp -R media "$TARGET/storage"
  fi
fi

cat > "$TARGET/README.txt" <<TXT
Starlight Jewellery backup $STAMP
- db.dump: PostgreSQL custom-format dump of schema "starlight" (restore with pg_restore).
- storage/: product images with manifest.json (object keys must be preserved).
Restore procedure: docs/operations.md
TXT
echo "Backup complete: $TARGET"
