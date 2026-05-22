import { buildBreadcrumbListJsonLd, type BreadcrumbListItem } from "#app/lib/seo";

import { JsonLdScript } from "./json-ld-script";

type BreadcrumbListJsonLdProps = {
  items: BreadcrumbListItem[];
};

export function BreadcrumbListJsonLd({ items }: BreadcrumbListJsonLdProps) {
  const jsonLd = buildBreadcrumbListJsonLd(items);

  return <JsonLdScript value={jsonLd} />;
}
