import { z } from "zod";

import { POST_TYPES } from "#app/features/posts/post-type";
import { requiredString } from "#app/lib/form-schema";

export const MAX_IMAGES_PER_POST = 3;
export const MAX_IMAGE_ALT_TEXT_LENGTH = 160;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
   Browsers post HTML checkboxes as `"on"` when checked and omit the
   field when unchecked, so we build a tiny shim that accepts either
   shape and falls through to `false` otherwise.
 */
const checkbox = z
  .literal("on")
  .optional()
  .transform((value) => value === "on");

/**
   Post write schema. Used in both the create and update actions (server
   side) and in Conform's client-side onValidate so the same error
   messages light up in either place. `publishedAt` is intentionally
   server-managed: the DB initializes it on create, and publishing a draft
   refreshes it to the actual publication time.
 */
export const PostFormSchema = z.object({
  title: requiredString("Naslov je obavezan.")
    .min(3, "Naslov mora imati najmanje 3 znaka.")
    .max(200, "Naslov može imati najviše 200 znakova."),
  slug: requiredString("Dio URL-a je obavezan.")
    .min(3, "Dio URL-a mora imati najmanje 3 znaka.")
    .max(80, "Dio URL-a može imati najviše 80 znakova.")
    .regex(SLUG_RE, "Koristite samo mala slova, brojeve i crtice."),
  type: z.enum(POST_TYPES, { message: "Odaberite vrstu objave." }),
  body: requiredString("Tekst je obavezan.")
    .min(1, "Tekst je obavezan.")
    .max(50_000, "Tekst može imati najviše 50.000 znakova."),
  publish: checkbox,
  notifyOnPublish: checkbox,
  featured: checkbox,
  pinned: checkbox,
});
