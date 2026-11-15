import { z } from "zod";

/**
   Shape of `app/dzemat.config.ts`, the one file a fork edits to describe its
   džemat. Runtime code imports only the `DzematConfig` type, so this schema
   stays out of browser bundles; the build validates the config with it.
 */

const text = z
  .string()
  .regex(/^\S(?:[\s\S]*\S)?$/, "must be non-empty text without leading or trailing spaces");

const webUrl = z.url({ protocol: /^https?$/, error: "must be an absolute http(s) URL" });

const organization = z.strictObject({
  name: text,
  nameGenitive: text,
  url: webUrl.optional(),
});

const dzematConfigSchema = z.strictObject({
  name: text,
  tagline: text,
  logoAlt: text,
  organizations: z.tuple([organization], organization),
  location: z
    .strictObject({
      address: text,
      mapQuery: text.optional(),
    })
    .optional(),
  socialLinks: z.strictObject({
    facebook: webUrl.optional(),
    youtube: webUrl.optional(),
  }),
});

export type DzematConfig = z.input<typeof dzematConfigSchema>;

/** Readable list of problems with a džemat config, or `null` when it is valid. */
export function describeDzematConfigProblems(config: unknown): string | null {
  const result = dzematConfigSchema.safeParse(config);

  return result.success ? null : z.prettifyError(result.error);
}
