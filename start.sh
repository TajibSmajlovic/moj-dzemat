#!/usr/bin/env sh
set -eu

# LiteFS has finished mounting by the time this script runs (see
# `exec` in litefs.yml). `DATABASE_URL` already points at /litefs/data.db.
#
# Apply any outstanding migrations before serving traffic. `migrate
# deploy` is idempotent and safe to run on every boot; failures crash
# the Machine which Fly then restarts with exponential backoff.
echo "[start] applying Prisma migrations"
npx prisma migrate deploy

echo "[start] booting server on port ${PORT:-3000}"
exec node build/server-entry.mjs
