import { jsonLdScriptContent } from "#app/lib/seo";

type JsonLdScriptProps = {
  value: unknown;
};

export function JsonLdScript({ value }: JsonLdScriptProps) {
  if (!value) return null;

  return (
    <script
      type="application/ld+json"
      // JSON-LD payloads are serialized and `</` is escaped to prevent an early
      // close of the script tag.
      // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- escaped JSON-LD
      dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(value) }}
    />
  );
}
