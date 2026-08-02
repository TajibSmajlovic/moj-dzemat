import { z } from "zod";

import { isValidYmd } from "#app/lib/date";
import { requiredString } from "#app/lib/form-schema";

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 300;

export const ImportantDateFormSchema = z.object({
  title: requiredString("Naslov je obavezan.")
    .min(3, "Naslov mora imati najmanje 3 znaka.")
    .max(TITLE_MAX, `Naslov može imati najviše ${TITLE_MAX} znakova.`),
  date: requiredString("Datum je obavezan.").refine(
    isValidYmd,
    "Unesite ispravan datum (format: GGGG-MM-DD).",
  ),
  recursYearly: z
    .literal("on")
    .optional()
    .transform((value) => value === "on"),
  // Optional. Empty string from the textarea becomes null so we store a clean
  // value and the public card can branch on `description != null`.
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Opis može imati najviše ${DESCRIPTION_MAX} znakova.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});
