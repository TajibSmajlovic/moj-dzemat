export function qaExcerpt(text: string, max = 160): string {
  const normalized = text.replaceAll(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;

  return `${normalized.slice(0, max).trimEnd()}…`;
}

export function qaFaqPageJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function qaSingleQuestionJsonLd(args: { question: string; answer: string }) {
  return qaFaqPageJsonLd([args]);
}
