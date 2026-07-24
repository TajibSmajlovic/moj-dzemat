import { describe, expect, it } from "vitest";

import { CommunityInfoFormSchema } from "#app/features/contact/contact-schema";

describe("CommunityInfoFormSchema", () => {
  it("accepts a full contact payload and normalizes empty strings to null", () => {
    const result = CommunityInfoFormSchema.safeParse({
      showAbout: "on",
      showContact: "on",
      showImam: "on",
      showBoard: "on",
      showBank: "on",
      showLocation: "on",
      aboutText: "  Džemat okuplja vjernike.  ",
      imamName: "  Hfz. Ime Prezime  ",
      imamPhone: "+38761111222",
      imamEmail: "imam@example.com",
      contactPhone: "+38733111222",
      contactEmail: "kontakt@example.com",
      officeHours: "Radnim danima 9-14h",
      bankAccount: "ba39 1290 0794 0102 8494",
      bankBeneficiary: "Džemat Test",
      bankName: "Test banka",
      bankSwift: "testba22",
      bankNote: "Svrha: članarina",
      boardNote: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        showAbout: true,
        showContact: true,
        showImam: true,
        showBoard: true,
        showBank: true,
        showLocation: true,
        aboutText: "Džemat okuplja vjernike.",
        imamName: "Hfz. Ime Prezime",
        imamPhone: "+38761111222",
        imamEmail: "imam@example.com",
        contactPhone: "+38733111222",
        contactEmail: "kontakt@example.com",
        officeHours: "Radnim danima 9-14h",
        bankAccount: "BA391290079401028494",
        bankBeneficiary: "Džemat Test",
        bankName: "Test banka",
        bankSwift: "TESTBA22",
        bankNote: "Svrha: članarina",
        boardNote: null,
      });
    }
  });

  it("accepts an all-empty form as a cleared contact page", () => {
    const result = CommunityInfoFormSchema.safeParse({
      showAbout: "on",
      showContact: "on",
      showImam: "on",
      showBoard: "on",
      showBank: "on",
      showLocation: "on",
      aboutText: "",
      imamName: "",
      imamPhone: "",
      imamEmail: "",
      contactPhone: "",
      contactEmail: "",
      officeHours: "",
      bankAccount: "",
      bankBeneficiary: "",
      bankName: "",
      bankSwift: "",
      bankNote: "",
      boardNote: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        showAbout: true,
        showContact: true,
        showImam: true,
        showBoard: true,
        showBank: true,
        showLocation: true,
      });
      expect(
        Object.entries(result.data)
          .filter(([key]) => !key.startsWith("show"))
          .every(([, value]) => value === null),
      ).toBe(true);
    }
  });

  it("maps omitted visibility checkboxes to false", () => {
    const result = CommunityInfoFormSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        showAbout: false,
        showContact: false,
        showImam: false,
        showBoard: false,
        showBank: false,
        showLocation: false,
      });
    }
  });

  it("accepts and normalizes a domestic transaction account", () => {
    const result = CommunityInfoFormSchema.safeParse({
      bankAccount: "101-132-00534235-95",
      bankBeneficiary: "Džemat Test",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bankAccount).toBe("1011320053423595");
    }
  });

  it("rejects invalid contact and bank details", () => {
    expect(
      CommunityInfoFormSchema.safeParse({
        contactEmail: "nije-email",
      }).success,
    ).toBe(false);

    expect(
      CommunityInfoFormSchema.safeParse({
        contactPhone: "telefon",
      }).success,
    ).toBe(false);

    expect(
      CommunityInfoFormSchema.safeParse({
        bankAccount: "1",
        bankBeneficiary: "Džemat Test",
      }).success,
    ).toBe(false);

    expect(
      CommunityInfoFormSchema.safeParse({
        bankAccount: "BA391290079401028495",
        bankBeneficiary: "Džemat Test",
      }).success,
    ).toBe(false);

    expect(
      CommunityInfoFormSchema.safeParse({
        bankAccount: "BA391290079401028494",
        bankBeneficiary: "Džemat Test",
        bankSwift: "12345678",
      }).success,
    ).toBe(false);
  });

  it("requires a beneficiary with an account and an account with supporting details", () => {
    expect(
      CommunityInfoFormSchema.safeParse({
        bankAccount: "BA391290079401028494",
      }).success,
    ).toBe(false);

    expect(
      CommunityInfoFormSchema.safeParse({
        bankBeneficiary: "Džemat Test",
      }).success,
    ).toBe(false);
  });
});
