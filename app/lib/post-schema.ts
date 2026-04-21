import { z } from "zod";

import { requiredString } from "#app/lib/form-schema";
import { POST_TYPES } from "#app/lib/post-type";

/** Hard cap for images per post; enforced in admin actions and UI. */
export const MAX_IMAGES_PER_POST = 3;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Browsers post HTML checkboxes as `"on"` when checked and omit the
 * field when unchecked, so we build a tiny shim that accepts either
 * shape and falls through to `false` otherwise.
 */
const checkbox = z
  .literal("on")
  .optional()
  .transform((value) => value === "on");

/**
 * Post write schema. Used in both the create and update actions (server
 * side) and in Conform's client-side onValidate so the same error
 * messages light up in either place. `publishedAt` is intentionally
 * not part of the editable surface — the DB `@default(now())` records
 * the creation moment, which is all the public UI ever shows.
 */
export const PostFormSchema = z.object({
  title: requiredString("Naslov je obavezan.")
    .min(3, "Naslov mora imati najmanje 3 znaka.")
    .max(200, "Naslov može imati najviše 200 znakova."),
  slug: requiredString("Slug je obavezan.")
    .min(3, "Slug mora imati najmanje 3 znaka.")
    .max(80, "Slug može imati najviše 80 znakova.")
    .regex(SLUG_RE, "Koristite samo mala slova, brojeve i crtice."),
  type: z.enum(POST_TYPES, { message: "Odaberite vrstu objave." }),
  body: requiredString("Tekst je obavezan.")
    .min(1, "Tekst je obavezan.")
    .max(50_000, "Tekst je predug (max 50000 znakova)."),
  featured: checkbox,
  pinned: checkbox,
});
