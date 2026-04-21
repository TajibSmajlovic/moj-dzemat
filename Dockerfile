# syntax = docker/dockerfile:1.7

# ---- deps --------------------------------------------------------------
# Separate stage so we can copy `node_modules` into subsequent stages
# without re-running `npm ci`. Alpine for small image size; openssl is
# needed by Prisma's linux-musl engine.
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./

# `--ignore-scripts` skips our own `postinstall` (react-router typegen)
# which needs the app sources. We'll run it in the build stage below.
RUN npm ci --include=dev --ignore-scripts


# ---- build -------------------------------------------------------------
# Compile RR client + server bundles, generate Prisma client, and prune
# dev dependencies so the runtime image stays small.
FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN npx prisma generate
RUN npx react-router typegen
RUN npm run build

# After the build we only need production deps. We also re-run
# `prisma generate` so the pruned tree still carries the client.
RUN npm prune --omit=dev
RUN npx prisma generate


# ---- runtime -----------------------------------------------------------
# `flyio/litefs:0.5` is an Alpine image with `litefs` already on PATH and
# FUSE support compiled in. We layer Node on top so the single container
# can both mount the FS and serve HTTP.
FROM flyio/litefs:0.5 AS runtime
WORKDIR /app

# Alpine packages:
#   tini      - proper PID 1 so SIGTERM reaches Node instead of dangling
#   tzdata    - Europe/Sarajevo zone data for consistent Date formatting
#   openssl   - Prisma runtime dep
#   ca-certificates - Resend + any outbound HTTPS
#   nodejs/npm - runtime + prisma migrate deploy
#   sqlite    - backup/debug inside the machine
#   fuse3     - LiteFS FUSE mount
RUN apk add --no-cache \
      tini \
      tzdata \
      openssl \
      ca-certificates \
      nodejs \
      npm \
      sqlite \
      fuse3

ENV NODE_ENV=production \
    TZ=Europe/Sarajevo \
    PORT=3000 \
    DATABASE_URL=file:/litefs/data.db

# Copy the pruned production deps + built artifacts. Prisma schema is
# needed so `prisma migrate deploy` can run at boot.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

COPY litefs.yml /etc/litefs.yml
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000

# tini reaps zombies and forwards signals. LiteFS takes over the actual
# process tree - it fork/exec's our start.sh once the FUSE mount is
# ready (see `exec` block in litefs.yml).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["litefs", "mount"]
