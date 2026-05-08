import { z } from "zod";

/**
 * Parse + validate process.env at startup. Anything missing or malformed
 * crashes the boot so we never run with half-configured secrets.
 *
 * Secrets that support rotation (`SESSION_SECRET`, `PASSWORD_RESET_SECRET`)
 * accept a comma-separated list: the first value is the current signer,
 * all values verify. That way rotation is "add the new value at the front,
 * deploy, wait a session window, remove the old value" with zero downtime.
 */

const csvSecret = z
  .string()
  .min(16, "must be at least 16 chars")
  .transform((value) =>
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  )
  .refine((values) => values.length > 0, "at least one secret required");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL: z.string().min(1),

  SESSION_SECRET: csvSecret,
  PASSWORD_RESET_SECRET: csvSecret,
  HONEYPOT_SECRET: z.string().min(16),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().min(1),
  DZEMAT_NAME: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  DZEMAT_ADDRESS: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  DZEMAT_MAP_QUERY: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  FACEBOOK_PAGE_URL: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value))
    .pipe(z.string().url().optional()),
  CLOUDFLARE_WEB_ANALYTICS_TOKEN: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),

  APP_URL: z
    .string()
    .url()
    .transform((value) => value.replace(/\/$/, "")),

  PORT: z.coerce.number().int().positive().default(3000),

  // Dev-only hooks. `ENABLE_TEST_ROUTES=true` turns on /dev/last-email and
  // friends that e2e tests depend on. Never flip this in production.
  ENABLE_TEST_ROUTES: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  // Test-only escape hatch so browser automation does not need to sleep
  // just to satisfy the honeypot minimum-age check.
  HONEYPOT_SKIP_MIN_AGE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  // Test-only escape hatch for browser automation suites that would
  // otherwise trip the auth abuse protections by design. Never enable
  // this in production.
  DISABLE_RATE_LIMITING: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  // `fly.io` sets this automatically; used by LiteFS awareness helpers.
  FLY_REGION: z.string().optional(),
  PRIMARY_REGION: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Log and throw - Express will crash, systemd/Fly will restart us.
    console.error("Invalid environment variables:\n", z.treeifyError(parsed.error));

    throw new Error("Invalid environment variables");
  }

  cached = parsed.data;

  return cached;
}
