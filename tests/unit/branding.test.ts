import { describe, expect, it } from "vitest";

import {
  DEFAULT_SITE_NAME,
  formatPageTitle,
  formatSiteName,
  getSiteNameParts,
} from "#app/lib/branding";

describe("formatSiteName", () => {
  it("falls back to the default name when dzemat name is missing", () => {
    expect(formatSiteName()).toBe(DEFAULT_SITE_NAME);
    expect(formatSiteName("")).toBe(DEFAULT_SITE_NAME);
    expect(formatSiteName("   ")).toBe(DEFAULT_SITE_NAME);
  });

  it("appends the configured dzemat name", () => {
    expect(formatSiteName("Donje Mostre")).toBe("Moj Džemat - Donje Mostre");
  });
});

describe("formatPageTitle", () => {
  it("joins the page title with the default site name when no name is given", () => {
    expect(formatPageTitle("Objave")).toBe("Objave — Moj Džemat");
  });

  it("uses the provided site name", () => {
    expect(formatPageTitle("Objave", "Moj Džemat - Donje Mostre")).toBe(
      "Objave — Moj Džemat - Donje Mostre",
    );
  });
});

describe("getSiteNameParts", () => {
  it("keeps a bare site name as the brand", () => {
    expect(getSiteNameParts("Moj Džemat")).toEqual({
      brandName: "Moj Džemat",
      dzematName: null,
    });
  });

  it("splits the default brand from the configured dzemat name", () => {
    expect(getSiteNameParts("Moj Džemat - Donje Mostre")).toEqual({
      brandName: "Moj Džemat",
      dzematName: "Donje Mostre",
    });
  });

  it("does not split unrelated site names", () => {
    expect(getSiteNameParts("Džemat Donje Mostre")).toEqual({
      brandName: "Džemat Donje Mostre",
      dzematName: null,
    });
  });
});
