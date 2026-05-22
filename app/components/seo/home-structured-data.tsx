import { formatSiteDescription } from "#app/lib/branding";
import type { DzematLocation } from "#app/lib/maps";
import { DEFAULT_SOCIAL_IMAGE, getDefaultSocialImageUrl } from "#app/lib/seo";

import { JsonLdScript } from "./json-ld-script";

const RIJASET_ORGANIZATION = {
  "@type": "Organization",
  name: "Rijaset Islamske zajednice u Bosni i Hercegovini",
  url: "https://islamskazajednica.ba/",
};

const MUFTIJSTVO_SARAJEVSKO_ORGANIZATION = {
  "@type": "Organization",
  name: "Muftijstvo sarajevsko",
  url: "https://muftijstvosarajevsko.ba/",
  parentOrganization: RIJASET_ORGANIZATION,
};

const MEDZLIS_VISOKO_ORGANIZATION = {
  "@type": "Organization",
  name: "Medžlis Islamske zajednice Visoko",
  url: "https://muftijstvosarajevsko.ba/medzlis-islamske-zajednice-visoko/",
  parentOrganization: MUFTIJSTVO_SARAJEVSKO_ORGANIZATION,
};

type HomeStructuredDataProps = {
  facebookPageUrl: string | null;
  location: DzematLocation | null;
  siteName: string;
  siteUrl: string;
};

export function HomeStructuredData({
  facebookPageUrl,
  location,
  siteName,
  siteUrl,
}: HomeStructuredDataProps) {
  const imageUrl = getDefaultSocialImageUrl(siteUrl);
  const organizationId = `${siteUrl}/#organization`;
  const placeId = `${siteUrl}/#place`;
  const address = location
    ? {
        "@type": "PostalAddress",
        streetAddress: location.address,
        addressCountry: "BA",
      }
    : undefined;

  return (
    <JsonLdScript
      value={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": organizationId,
            name: siteName,
            url: siteUrl,
            description: formatSiteDescription(siteName),
            logo: {
              "@type": "ImageObject",
              url: `${siteUrl}/logo.png`,
            },
            image: {
              "@type": "ImageObject",
              url: imageUrl,
              width: DEFAULT_SOCIAL_IMAGE.width,
              height: DEFAULT_SOCIAL_IMAGE.height,
            },
            address,
            location: {
              "@id": placeId,
            },
            parentOrganization: MEDZLIS_VISOKO_ORGANIZATION,
            sameAs: facebookPageUrl ? [facebookPageUrl] : undefined,
          },
          {
            "@type": "Mosque",
            "@id": placeId,
            name: siteName,
            url: siteUrl,
            description: formatSiteDescription(siteName),
            image: imageUrl,
            address,
            hasMap: location?.mapsUrl,
            publicAccess: true,
            parentOrganization: {
              "@id": organizationId,
            },
          },
        ],
      }}
    />
  );
}
