#!/usr/bin/env sh
set -eu

echo "[start] applying Prisma migrations"
npx prisma migrate deploy

echo "[start] ensuring configured admin accounts exist"
node build/prisma-seed.mjs

echo "[start] booting server on port ${PORT:-3000}"
exec node build/server-entry.mjs
