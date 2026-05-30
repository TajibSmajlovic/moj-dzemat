import { describe, expect, it } from "vitest";

import { qaExcerpt, qaFaqPageJsonLd, qaSingleQuestionJsonLd } from "#app/features/qa/qa-seo";

describe("Q&A SEO helpers", () => {
  it("collapses whitespace and truncates excerpts", () => {
    expect(qaExcerpt("  Prvi\n\n drugi\tred  ", 50)).toBe("Prvi drugi red");
    expect(qaExcerpt("Jedan dva tri", 9)).toBe("Jedan dva…");
  });

  it("builds FAQPage JSON-LD with one Question per item", () => {
    const jsonLd = qaFaqPageJsonLd([
      { question: "Prvo pitanje?", answer: "Prvi odgovor." },
      { question: "Drugo pitanje?", answer: "Drugi odgovor." },
    ]);

    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Prvo pitanje?",
          acceptedAnswer: { "@type": "Answer", text: "Prvi odgovor." },
        },
        {
          "@type": "Question",
          name: "Drugo pitanje?",
          acceptedAnswer: { "@type": "Answer", text: "Drugi odgovor." },
        },
      ],
    });
  });

  it("builds the single-question JSON-LD shape as a one-item FAQPage", () => {
    expect(qaSingleQuestionJsonLd({ question: "Pitanje?", answer: "Odgovor." })).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: "Pitanje?" }],
    });
  });
});
