import { z } from "zod";

/**
   Zod schema and cached accessor for `process.env`.

   Secrets that support rotation (`SESSION_SECRET`, `PASSWORD_RESET_SECRET`)
   accept a comma-separated list: the first value is the current signer,
   all values verify. That way rotation is "add the new value at the front,
   deploy, wait a session window, remove the old value" with zero downtime.
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

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const testOnlyProductionFlags = [
  "ENABLE_TEST_ROUTES",
  "HONEYPOT_SKIP_MIN_AGE",
  "DISABLE_RATE_LIMITING",
] as const;

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    DATABASE_URL: z.string().min(1),

    SESSION_SECRET: csvSecret,
    PASSWORD_RESET_SECRET: csvSecret,
    HONEYPOT_SECRET: z.string().min(16),

    RESEND_API_KEY: optionalText,
    EMAIL_FROM: z.string().min(1),
    DZEMAT_NAME: optionalText,
    DZEMAT_ADDRESS: optionalText,
    DZEMAT_MAP_QUERY: optionalText,
    FACEBOOK_PAGE_URL: optionalText.pipe(z.string().url().optional()),
    CLOUDFLARE_WEB_ANALYTICS_TOKEN: optionalText,

    APP_URL: z
      .string()
      .url()
      .transform((value) => value.replace(/\/$/, "")),

    PORT: z.coerce.number().int().positive().default(3000),

    // Dev-only hook. `ENABLE_TEST_ROUTES=true` turns on /dev/last-email for
    // e2e password-reset flows. Never flip this in production.
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

    // Optional Fly deployment metadata accepted by the environment schema.
    FLY_REGION: z.string().optional(),
    PRIMARY_REGION: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;

    if (!value.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required in production",
      });
    }

    for (const key of testOnlyProductionFlags) {
      if (value[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} must be false in production`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Parse, validate, and cache the runtime environment. */

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail startup; the process supervisor applies its configured restart policy.
    console.error("Invalid environment variables:\n", z.treeifyError(parsed.error));

    throw new Error("Invalid environment variables");
  }

  cached = parsed.data;

  return cached;
}
