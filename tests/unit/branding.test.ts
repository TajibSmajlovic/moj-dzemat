import { describe, expect, it } from "vitest";

import {
  DEFAULT_SITE_NAME,
  formatPageTitle,
  formatSiteName,
  getSiteNameFromMatches,
  getSiteNameFromRootData,
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

describe("getSiteNameFromRootData", () => {
  it("falls back to the default for null, undefined, and primitives", () => {
    expect(getSiteNameFromRootData(null)).toBe(DEFAULT_SITE_NAME);
    expect(getSiteNameFromRootData(undefined)).toBe(DEFAULT_SITE_NAME);
    expect(getSiteNameFromRootData("string")).toBe(DEFAULT_SITE_NAME);
    expect(getSiteNameFromRootData(42)).toBe(DEFAULT_SITE_NAME);
  });

  it("falls back when the object has no siteName or it is non-string", () => {
    expect(getSiteNameFromRootData({})).toBe(DEFAULT_SITE_NAME);
    expect(getSiteNameFromRootData({ siteName: 123 })).toBe(DEFAULT_SITE_NAME);
    expect(getSiteNameFromRootData({ siteName: null })).toBe(DEFAULT_SITE_NAME);
  });

  it("returns the siteName when it is a string", () => {
    expect(getSiteNameFromRootData({ siteName: "Moj Džemat - Donje Mostre" })).toBe(
      "Moj Džemat - Donje Mostre",
    );
  });
});

describe("getSiteNameFromMatches", () => {
  it("returns the default when there is no root match", () => {
    expect(getSiteNameFromMatches([])).toBe(DEFAULT_SITE_NAME);
    expect(getSiteNameFromMatches([{ id: "other", data: { siteName: "X" } }])).toBe(
      DEFAULT_SITE_NAME,
    );
  });

  it("ignores undefined entries and finds the root match", () => {
    expect(getSiteNameFromMatches([undefined, { id: "root", data: { siteName: "Site" } }])).toBe(
      "Site",
    );
  });

  it("returns the siteName from the root match data", () => {
    expect(
      getSiteNameFromMatches([
        { id: "root", data: { siteName: "Moj Džemat - Donje Mostre" } },
        { id: "_public", data: {} },
      ]),
    ).toBe("Moj Džemat - Donje Mostre");
  });

  it("falls back when the root match has no data", () => {
    expect(getSiteNameFromMatches([{ id: "root" }])).toBe(DEFAULT_SITE_NAME);
  });
});
