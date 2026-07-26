import { describe, expect, it } from "vitest";

import { emailField, passwordField, requiredString } from "#app/lib/form-schema";

describe("requiredString", () => {
  it("trims by default and rejects empty or whitespace-only input", () => {
    const schema = requiredString("Polje je obavezno.");

    expect(schema.parse("  hello  ")).toBe("hello");

    const empty = schema.safeParse("   ");
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(empty.error.issues[0]?.message).toBe("Polje je obavezno.");
    }
  });

  it("preserves whitespace when trim is opted out", () => {
    const schema = requiredString("required", { trim: false });

    expect(schema.parse("  hello  ")).toBe("  hello  ");
    // Without trim, " " has length 1 so it satisfies min(1).
    expect(schema.safeParse(" ").success).toBe(true);
  });

  it("uses the provided message when the field is missing entirely", () => {
    const schema = requiredString("Polje je obavezno.");

    const missing = schema.safeParse(undefined);
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues[0]?.message).toBe("Polje je obavezno.");
    }
  });
});

describe("emailField", () => {
  it("uses the default Bosnian messages for required and invalid", () => {
    const schema = emailField();

    const missing = schema.safeParse(undefined);
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues[0]?.message).toBe("E-mail je obavezan.");
    }

    const invalid = schema.safeParse("not-an-email");
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe("Unesite ispravnu e-mail adresu.");
    }
  });

  it("accepts overridden messages", () => {
    const schema = emailField({
      requiredMessage: "Required!",
      invalidMessage: "Bad!",
    });

    const missing = schema.safeParse("");
    const invalid = schema.safeParse("nope");

    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues[0]?.message).toBe("Required!");
    }
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe("Bad!");
    }
  });

  it("accepts a valid email and trims surrounding whitespace", () => {
    expect(emailField().parse("  admin@dzemat.ba  ")).toBe("admin@dzemat.ba");
  });
});

describe("passwordField", () => {
  it("rejects empty strings with the required message when minLength defaults to 1", () => {
    const schema = passwordField();

    const empty = schema.safeParse("");
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(empty.error.issues[0]?.message).toBe("Lozinka je obavezna.");
    }
  });

  it("rejects too-short input with the dedicated minLengthMessage when minLength > 1", () => {
    const schema = passwordField({
      minLength: 10,
      minLengthMessage: "Najmanje 10 znakova.",
    });

    const tooShort = schema.safeParse("abc");
    expect(tooShort.success).toBe(false);
    if (!tooShort.success) {
      expect(tooShort.error.issues[0]?.message).toBe("Najmanje 10 znakova.");
    }
  });

  it("falls back to the required message when minLengthMessage is omitted", () => {
    const schema = passwordField({ minLength: 10, requiredMessage: "Obavezno!" });

    const tooShort = schema.safeParse("abc");
    expect(tooShort.success).toBe(false);
    if (!tooShort.success) {
      expect(tooShort.error.issues[0]?.message).toBe("Obavezno!");
    }
  });

  it("accepts a valid password", () => {
    expect(passwordField({ minLength: 10 }).parse("longenough123")).toBe("longenough123");
  });
});
