import { JsonLdScript } from "#app/components/seo/json-ld-script";
import { qaFaqPageJsonLd } from "#app/features/qa/qa-seo";

type QaPageJsonLdItem = {
  question: string;
  answer: string;
};

type QaPageJsonLdProps = {
  items: QaPageJsonLdItem[];
};

export function QaPageJsonLd({ items }: QaPageJsonLdProps) {
  if (items.length === 0) return null;

  return <JsonLdScript value={qaFaqPageJsonLd(items)} />;
}
