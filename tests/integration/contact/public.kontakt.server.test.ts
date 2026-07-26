import { beforeEach, describe, expect, it } from "vitest";

import { invalidateCommunityInfo } from "#app/features/contact/contact.server";
import { loader as contactLoader } from "#app/routes/_public.kontakt";

import { createCommunityInfo } from "../../factories";

describe("public contact route", () => {
  beforeEach(() => {
    invalidateCommunityInfo();
  });

  it("returns visible details and redacts hidden sections", async () => {
    await createCommunityInfo({
      aboutText: "Džemat Donje Moštre",
      contactEmail: "kontakt@example.com",
      bankAccount: "BA391290079401028494",
      showImam: false,
      showLocation: false,
    });

    const result = await contactLoader();

    expect(result.info).toMatchObject({
      aboutText: "Džemat Donje Moštre",
      contactEmail: "kontakt@example.com",
      bankAccount: "BA391290079401028494",
      bankName: "Test banka",
      bankSwift: "TESTBA22",
      showImam: false,
      showLocation: false,
      imamName: null,
      imamPhone: null,
      imamEmail: null,
    });
    expect(result.location).toBeNull();
  });
});
