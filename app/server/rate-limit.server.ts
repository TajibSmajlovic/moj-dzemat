import { TTLCache } from "@isaacs/ttlcache";

import { env } from "#app/server/env.server";

/**
 * In-memory, per-IP rate limiter. Because Fly pins this app to a single
 * instance (single SQLite writer), process-local counters are enough -
 * a multi-machine fleet would need Redis or a DB table. Keys are
 * scoped per limiter so forgot-password and login counters don't collide.
 */

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetInMs: number;
};

type Bucket = { count: number; resetAt: number };

type LimiterOptions = {
  windowMs: number;
  max: number;
  name: string;
};

function createRateLimiter({ windowMs, max, name }: LimiterOptions) {
  const cache = new TTLCache<string, Bucket>({ ttl: windowMs, max: 10_000 });

  return {
    name,
    check(ip: string): RateLimitResult {
      if (env().DISABLE_RATE_LIMITING) {
        return { ok: true, remaining: Number.POSITIVE_INFINITY, resetInMs: 0 };
      }

      const now = Date.now();
      const key = ip;
      const existing = cache.get(key);

      if (!existing || existing.resetAt <= now) {
        cache.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, remaining: max - 1, resetInMs: windowMs };
      }

      if (existing.count >= max) {
        return {
          ok: false,
          remaining: 0,
          resetInMs: existing.resetAt - now,
        };
      }

      existing.count += 1;

      return {
        ok: true,
        remaining: max - existing.count,
        resetInMs: existing.resetAt - now,
      };
    },
    reset(ip: string) {
      cache.delete(ip);
    },
  };
}

// Separate per-IP limiters for the two public auth write flows.
const HOUR = 60 * 60 * 1000;

export const loginLimiter = createRateLimiter({
  name: "login",
  windowMs: HOUR,
  max: 10,
});

export const forgotPasswordLimiter = createRateLimiter({
  name: "forgot-password",
  windowMs: HOUR,
  max: 5,
});

/**
 * Extract the client IP from common proxy headers. Fly puts the real
 * address in `fly-client-ip`. Express's `req.ip` is the fallback.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("fly-client-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
