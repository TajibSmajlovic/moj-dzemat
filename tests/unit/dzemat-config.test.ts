import { describe, expect, it } from "vitest";

import { dzematConfig } from "#app/dzemat.config";
import { describeDzematConfigProblems, type DzematConfig } from "#app/lib/dzemat-config";

const validConfig = {
  name: "Primjer",
  tagline: "Islamska zajednica u Bosni i Hercegovini",
  logoAlt: "Logo Islamske zajednice",
  organizations: [
    {
      name: "Medžlis Islamske zajednice Primjer",
      nameGenitive: "Medžlisa Islamske zajednice Primjer",
    },
  ],
  socialLinks: {},
} satisfies DzematConfig;

describe("džemat config", () => {
  it("accepts the shipped config", () => {
    expect(describeDzematConfigProblems(dzematConfig)).toBeNull();
  });

  it("accepts a minimal config without optional location, links, or URLs", () => {
    expect(describeDzematConfigProblems(validConfig)).toBeNull();
  });

  it("names each invalid field so a fork can fix it", () => {
    const problems = describeDzematConfigProblems({
      ...validConfig,
      name: " Primjer",
      organizations: [{ ...validConfig.organizations[0], url: "medzlis.ba" }],
      location: { address: "" },
      socialLinks: { facebook: "javascript:alert(1)" },
    });

    expect(problems).toContain("→ at name");
    expect(problems).toContain("→ at organizations[0].url");
    expect(problems).toContain("→ at location.address");
    expect(problems).toContain("→ at socialLinks.facebook");
  });

  it("requires at least one organization and rejects unknown keys", () => {
    const problems = describeDzematConfigProblems({
      ...validConfig,
      organizations: [],
      youtube: "https://www.youtube.com/@primjer",
    });

    expect(problems).toContain("→ at organizations");
    expect(problems).toContain('Unrecognized key: "youtube"');
  });
});
