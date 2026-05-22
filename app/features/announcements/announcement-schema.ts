import { z } from "zod";

import { requiredString } from "#app/lib/form-schema";

export const AnnouncementFormSchema = z.object({
  message: requiredString("Poruka je obavezna.")
    .min(3, "Poruka mora imati najmanje 3 znaka.")
    .max(500, "Poruka može imati najviše 500 znakova."),
  // Checkbox inputs submit `"on"` when checked and are absent otherwise.
  // Reject other present values so malformed submissions do not look like
  // legitimate unchecked browser fields.
  isActive: z
    .literal("on")
    .optional()
    .transform((value) => value === "on"),
});
