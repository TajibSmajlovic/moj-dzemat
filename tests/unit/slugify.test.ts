import { describe, expect, it } from "vitest";

import { slugify } from "#app/lib/slugify";

describe("slugify", () => {
  it("lowercases and replaces whitespace with dashes", () => {
    expect(slugify("Hutba petak")).toBe("hutba-petak");
  });

  it("strips Bosnian diacritics", () => {
    expect(slugify("Čaršija šeher")).toBe("carsija-seher");
  });

  it("turns 'đ' and 'Đ' into 'd'", () => {
    expect(slugify("Džemat Đakovica")).toBe("dzemat-dakovica");
  });

  it("drops non-alphanumeric runs", () => {
    expect(slugify("Vijesti  -- 2026 / janurar!!!")).toBe("vijesti-2026-janurar");
  });

  it("trims leading/trailing dashes", () => {
    expect(slugify("--- hello ---")).toBe("hello");
  });

  it("caps length at 80 characters", () => {
    const longInput = "a".repeat(200);
    expect(slugify(longInput)).toHaveLength(80);
  });

  it("returns empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
  });
});
