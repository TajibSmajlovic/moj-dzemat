import { describe, expect, it } from "vitest";

import { plainExcerpt } from "#app/lib/post-excerpt";

describe("plainExcerpt", () => {
  it("strips HTML and normalizes whitespace", () => {
    expect(plainExcerpt("<p>Prva</p>\n\n<p>  druga  </p>")).toBe("Prva druga");
  });

  it("decodes HTML entities before normalizing whitespace", () => {
    expect(plainExcerpt("<p>Hvala&nbsp;Allahu,&nbsp;Gospodaru &amp; Stvoritelju.</p>")).toBe(
      "Hvala Allahu, Gospodaru & Stvoritelju.",
    );
  });

  it("decodes numeric HTML entities", () => {
    expect(plainExcerpt("Prva&#160;druga&#xA0;treća")).toBe("Prva druga treća");
  });

  it("truncates long content with an ellipsis", () => {
    expect(plainExcerpt("abcdefgh", 5)).toBe("abcde…");
  });

  it("returns the full text when it already fits", () => {
    expect(plainExcerpt("Kratak tekst", 20)).toBe("Kratak tekst");
  });
});
