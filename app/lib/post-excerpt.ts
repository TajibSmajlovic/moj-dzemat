const DEFAULT_EXCERPT_CHARS = 220;

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

export function plainExcerpt(body: string, maxChars = DEFAULT_EXCERPT_CHARS): string {
  const plain = decodeHtmlEntities(body.replaceAll(/<[^>]*>/g, " "));
  const normalized = plain.replaceAll(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;

  return `${normalized.slice(0, maxChars).trimEnd()}…`;
}

function decodeHtmlEntities(value: string): string {
  return value.replaceAll(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, rawCode: string) => {
    const code = rawCode.toLowerCase();

    if (code.startsWith("#x")) {
      return decodeCodePoint(entity, Number.parseInt(code.slice(2), 16));
    }

    if (code.startsWith("#")) {
      return decodeCodePoint(entity, Number.parseInt(code.slice(1), 10));
    }

    return NAMED_HTML_ENTITIES[code] ?? entity;
  });
}

function decodeCodePoint(fallback: string, codePoint: number): string {
  if (!Number.isFinite(codePoint)) return fallback;

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return fallback;
  }
}
