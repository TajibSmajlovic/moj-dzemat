import { z } from "zod";

type StringFieldOptions = {
  trim?: boolean;
};

export function requiredString(message: string, options: StringFieldOptions = {}) {
  let schema = z.string({ error: message });
  if (options.trim ?? true) {
    schema = schema.trim();
  }

  return schema.min(1, message);
}

type EmailFieldOptions = {
  requiredMessage?: string;
  invalidMessage?: string;
};

export function emailField(options: EmailFieldOptions = {}) {
  // `.check()` keeps the email check after trimming, as the deprecated
  // `.email()` method did, and keeps the schema a `ZodString`.
  return requiredString(options.requiredMessage ?? "E-mail je obavezan.").check(
    z.email(options.invalidMessage ?? "Unesite ispravnu e-mail adresu."),
  );
}

type PasswordFieldOptions = {
  requiredMessage?: string;
  minLength?: number;
  minLengthMessage?: string;
  maxBytes?: number;
  maxBytesMessage?: string;
};

export function passwordField(options: PasswordFieldOptions = {}) {
  const minLength = options.minLength ?? 1;
  const requiredMessage = options.requiredMessage ?? "Lozinka je obavezna.";

  return z
    .string({ error: requiredMessage })
    .min(
      minLength,
      minLength === 1 ? requiredMessage : (options.minLengthMessage ?? requiredMessage),
    )
    .refine(
      (password) =>
        options.maxBytes === undefined ||
        new TextEncoder().encode(password).length <= options.maxBytes,
      { message: options.maxBytesMessage ?? "Lozinka je preduga." },
    );
}
