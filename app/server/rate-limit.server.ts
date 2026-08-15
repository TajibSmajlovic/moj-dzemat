import { TTLCache } from "@isaacs/ttlcache";

import { HOUR_MS, MINUTE_MS } from "#app/lib/time";
import { env } from "#app/server/env.server";

/**
   In-memory, per-IP rate limiter. This deployment is designed for one app
   Machine, so process-local counters are sufficient. A multi-machine fleet
   would need shared storage such as Redis or a database table. Keys are scoped
   per limiter so unrelated counters do not collide.
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

// Separate per-IP limiters for each public write flow.
export const loginLimiter = createRateLimiter({
  name: "login",
  windowMs: HOUR_MS,
  max: 10,
});

export const forgotPasswordLimiter = createRateLimiter({
  name: "forgot-password",
  windowMs: HOUR_MS,
  max: 5,
});

export const qaQuestionLimiter = createRateLimiter({
  name: "qa-question",
  windowMs: HOUR_MS,
  max: 5,
});

export const webPushSubscriptionLimiter = createRateLimiter({
  name: "web-push-subscription",
  windowMs: MINUTE_MS,
  max: 20,
});

export const staticFileLimiter = createRateLimiter({
  name: "static-files",
  windowMs: MINUTE_MS,
  max: 300,
});

/**
   Extract the client IP from common proxy headers. Fly puts the real
   address in `fly-client-ip`. Accepts a header-lookup callback so the
   same precedence applies to both Fetch `Request` and Express `req`.
 */
export function clientIpFromHeaders(
  getHeader: (name: string) => string | null | undefined,
): string {
  return (
    getHeader("fly-client-ip") ??
    getHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    getHeader("x-real-ip") ??
    "unknown"
  );
}

export function getClientIp(request: Request): string {
  return clientIpFromHeaders((name) => request.headers.get(name));
}
