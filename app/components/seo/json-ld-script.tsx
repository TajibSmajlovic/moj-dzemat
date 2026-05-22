import { jsonLdScriptContent } from "#app/lib/seo";

type JsonLdScriptProps = {
  value: unknown;
};

export function JsonLdScript({ value }: JsonLdScriptProps) {
  if (!value) return null;

  return (
    <script
      type="application/ld+json"
      // Safe: JSON-LD payloads are serialized and `</` is escaped to
      // prevent accidental early-close of the script tag.
      dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(value) }}
    />
  );
}
