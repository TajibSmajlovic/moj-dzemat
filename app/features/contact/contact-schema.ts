import { z } from "zod";

/** Soft upper bounds for contact fields kept short for a community page. */
export const ABOUT_TEXT_MAX = 2000;
export const NAME_MAX = 120;
export const PHONE_MAX = 40;
export const EMAIL_MAX = 120;
export const OFFICE_HOURS_MAX = 300;
export const BANK_ACCOUNT_MAX = 64;
export const BANK_BENEFICIARY_MAX = 120;
export const BANK_NAME_MAX = 120;
export const BANK_SWIFT_MAX = 11;
export const BANK_NOTE_MAX = 300;
export const BOARD_NOTE_MAX = 500;

const visibilityFlag = z.preprocess(
  (value) => value === true || value === "on" || value === "true",
  z.boolean(),
);

/**
   Optional trimmed string that becomes `null` when empty. Keeps the
   public page branching on `field != null` instead of empty strings.
 */
function optionalText(max: number, tooLongMessage: string) {
  return z
    .string()
    .trim()
    .max(max, tooLongMessage)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));
}

function optionalEmail(tooLongMessage: string, invalidMessage: string) {
  return z
    .string()
    .trim()
    .max(EMAIL_MAX, tooLongMessage)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine(
      (value) => value === null || z.string().email().safeParse(value).success,
      invalidMessage,
    );
}

/**
   Phone numbers stay presentation-friendly while rejecting arbitrary prose.
   Six digits is deliberately permissive enough for local and short numbers.
 */
function optionalPhone(tooLongMessage: string, invalidMessage: string) {
  return z
    .string()
    .trim()
    .max(PHONE_MAX, tooLongMessage)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine(
      (value) =>
        value === null ||
        (/^\+?[0-9][0-9 ()/.-]*$/.test(value) && (value.match(/\d/g)?.length ?? 0) >= 6),
      invalidMessage,
    );
}

function isValidIban(value: string): boolean {
  if (
    value.length < 15 ||
    value.length > 34 ||
    !/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(value) ||
    (value.startsWith("BA") && value.length !== 20)
  ) {
    return false;
  }

  const rearranged = `${value.slice(4)}${value.slice(0, 4)}`;
  let remainder = 0;

  for (const character of rearranged) {
    const numericValue = /\d/.test(character) ? character : String(character.codePointAt(0)! - 55);

    for (const digit of numericValue) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }

  return remainder === 1;
}

function isValidBankAccount(value: string): boolean {
  return /^\d{16}$/.test(value) || isValidIban(value);
}

/**
   Supports both an IBAN and the domestic transaction-account numbers
   commonly published by Bosnian Islamic Community organizations.
 */
function optionalBankAccount() {
  return z
    .string()
    .trim()
    .max(BANK_ACCOUNT_MAX, `Broj računa može imati najviše ${BANK_ACCOUNT_MAX} znakova.`)
    .optional()
    .transform((value) => {
      if (!value || value.length === 0) return null;
      return value.replaceAll(/[\s./-]+/g, "").toUpperCase();
    })
    .refine(
      (value) => value === null || isValidBankAccount(value),
      "Unesite važeći IBAN ili domaći račun od 16 cifara.",
    );
}

function optionalSwift() {
  return z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value || value.length === 0) return null;
      return value.replaceAll(/\s+/g, "").toUpperCase();
    })
    .refine(
      (value) => value === null || /^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/.test(value),
      "SWIFT/BIC mora imati 8 ili 11 znakova u ispravnom formatu.",
    );
}

export const CommunityInfoFormSchema = z
  .object({
    showAbout: visibilityFlag,
    showContact: visibilityFlag,
    showImam: visibilityFlag,
    showBoard: visibilityFlag,
    showBank: visibilityFlag,
    showLocation: visibilityFlag,
    aboutText: optionalText(
      ABOUT_TEXT_MAX,
      `Tekst o džematu može imati najviše ${ABOUT_TEXT_MAX} znakova.`,
    ),
    imamName: optionalText(NAME_MAX, `Ime imama može imati najviše ${NAME_MAX} znakova.`),
    imamPhone: optionalPhone(
      `Telefon imama može imati najviše ${PHONE_MAX} znakova.`,
      "Unesite ispravan telefon imama.",
    ),
    imamEmail: optionalEmail(
      `E-mail imama može imati najviše ${EMAIL_MAX} znakova.`,
      "Unesite ispravnu e-mail adresu imama.",
    ),
    contactPhone: optionalPhone(
      `Kontakt telefon može imati najviše ${PHONE_MAX} znakova.`,
      "Unesite ispravan kontakt telefon.",
    ),
    contactEmail: optionalEmail(
      `Kontakt e-mail adresa može imati najviše ${EMAIL_MAX} znakova.`,
      "Unesite ispravnu kontaktnu e-mail adresu.",
    ),
    officeHours: optionalText(
      OFFICE_HOURS_MAX,
      `Radno vrijeme može imati najviše ${OFFICE_HOURS_MAX} znakova.`,
    ),
    bankAccount: optionalBankAccount(),
    bankBeneficiary: optionalText(
      BANK_BENEFICIARY_MAX,
      `Naziv primaoca može imati najviše ${BANK_BENEFICIARY_MAX} znakova.`,
    ),
    bankName: optionalText(
      BANK_NAME_MAX,
      `Naziv banke može imati najviše ${BANK_NAME_MAX} znakova.`,
    ),
    bankSwift: optionalSwift(),
    bankNote: optionalText(
      BANK_NOTE_MAX,
      `Napomena uz račun može imati najviše ${BANK_NOTE_MAX} znakova.`,
    ),
    boardNote: optionalText(
      BOARD_NOTE_MAX,
      `Napomena o odboru može imati najviše ${BOARD_NOTE_MAX} znakova.`,
    ),
  })
  .superRefine((value, context) => {
    const hasSupportingBankDetails = Boolean(
      value.bankBeneficiary ?? value.bankName ?? value.bankSwift ?? value.bankNote,
    );

    if (hasSupportingBankDetails && !value.bankAccount) {
      context.addIssue({
        code: "custom",
        path: ["bankAccount"],
        message: "Unesite IBAN ili broj računa za navedene bankovne podatke.",
      });
    }

    if (value.bankAccount && !value.bankBeneficiary) {
      context.addIssue({
        code: "custom",
        path: ["bankBeneficiary"],
        message: "Unesite naziv primaoca za ovaj račun.",
      });
    }
  });

export type CommunityInfoFormValues = z.infer<typeof CommunityInfoFormSchema>;
