const DEFAULT_EXCERPT_CHARS = 220;

export function plainExcerpt(body: string, maxChars = DEFAULT_EXCERPT_CHARS): string {
  const plain = body.replaceAll(/<[^>]*>/g, "");
  const normalized = plain.replaceAll(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;

  return `${normalized.slice(0, maxChars).trimEnd()}…`;
}
