import { describe, expect, it } from "vitest";

import { plainExcerpt } from "#app/lib/post-excerpt";

describe("plainExcerpt", () => {
  it("strips HTML and normalizes whitespace", () => {
    expect(plainExcerpt("<p>Prva</p>\n\n<p>  druga  </p>")).toBe("Prva druga");
  });

  it("truncates long content with an ellipsis", () => {
    expect(plainExcerpt("abcdefgh", 5)).toBe("abcde…");
  });

  it("returns the full text when it already fits", () => {
    expect(plainExcerpt("Kratak tekst", 20)).toBe("Kratak tekst");
  });
});
