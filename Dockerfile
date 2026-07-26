# syntax = docker/dockerfile:1.7

# ---- deps --------------------------------------------------------------
# Separate stage so we can copy `node_modules` into subsequent stages
# without re-running `npm ci`. Alpine for small image size; build tools
# are available here if better-sqlite3 needs to compile its native binding.
FROM node:24-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl python3 make g++

COPY package.json package-lock.json ./

# `--ignore-scripts` skips our own `postinstall` (react-router typegen)
# which needs the app sources. It also skips native dependency scripts, so
# rebuild better-sqlite3 explicitly before copying node_modules onward.
RUN npm ci --include=dev --ignore-scripts
RUN npm rebuild better-sqlite3


# ---- build -------------------------------------------------------------
# Compile RR client + server bundles, generate Prisma client, and prune
# dev dependencies so the runtime image stays small.
FROM node:24-alpine AS build
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ARG PWA_WORKER_MODE=normal

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production \
    DATABASE_URL=file:./data.db
RUN npx prisma generate
RUN npx react-router typegen
RUN npm run build -- --worker-mode=${PWA_WORKER_MODE}

# The generated Prisma client is bundled into the server artifacts above.
# After the build we only need production dependencies.
RUN npm prune --omit=dev --ignore-scripts


# ---- runtime -----------------------------------------------------------
# LiteFS is a static binary, so copy it into the official Node image. This
# keeps the production runtime on the same Node major as the build stages
# instead of relying on the LiteFS image's unversioned Alpine nodejs package.
FROM flyio/litefs:0.5 AS litefs

FROM node:24-alpine AS runtime
WORKDIR /app

COPY --from=litefs /usr/local/bin/litefs /usr/local/bin/litefs

# Alpine packages:
#   tini      - proper PID 1 so SIGTERM reaches Node instead of dangling
#   tzdata    - Europe/Sarajevo zone data for consistent Date formatting
#   openssl   - Prisma runtime dep
#   ca-certificates - Resend + any outbound HTTPS
#   sqlite    - backup/debug inside the machine
#   fuse3     - LiteFS FUSE mount
RUN apk add --no-cache \
      tini \
      tzdata \
      openssl \
      ca-certificates \
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
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
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
