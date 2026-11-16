import { dzemat, SITE_DESCRIPTION, SITE_NAME } from "#app/lib/branding";
import { DZEMAT_LOCATION } from "#app/lib/maps";
import { DEFAULT_SOCIAL_IMAGE, getDefaultSocialImageUrl } from "#app/lib/seo";
import { SOCIAL_LINKS } from "#app/lib/social-links";

import { JsonLdScript } from "./json-ld-script";

type OrganizationNode = {
  "@type": "Organization";
  name: string;
  url?: string;
  parentOrganization?: OrganizationNode;
};

/** The closest configured organization, nested inside each broader one. */
const PARENT_ORGANIZATION = nestOrganizations();

function nestOrganizations(): OrganizationNode | undefined {
  let parentOrganization: OrganizationNode | undefined;

  for (const { name, url } of dzemat.organizations) {
    parentOrganization = { "@type": "Organization", name, url, parentOrganization };
  }

  return parentOrganization;
}

const SOCIAL_PROFILE_URLS = SOCIAL_LINKS.map((link) => link.href);

export function HomeStructuredData({ siteUrl }: { siteUrl: string }) {
  const imageUrl = getDefaultSocialImageUrl(siteUrl);
  const organizationId = `${siteUrl}/#organization`;
  const placeId = `${siteUrl}/#place`;
  const address = DZEMAT_LOCATION
    ? {
        "@type": "PostalAddress",
        streetAddress: DZEMAT_LOCATION.address,
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
            name: SITE_NAME,
            url: siteUrl,
            description: SITE_DESCRIPTION,
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
            parentOrganization: PARENT_ORGANIZATION,
            sameAs: SOCIAL_PROFILE_URLS.length > 0 ? SOCIAL_PROFILE_URLS : undefined,
          },
          {
            "@type": "Mosque",
            "@id": placeId,
            name: SITE_NAME,
            url: siteUrl,
            description: SITE_DESCRIPTION,
            image: imageUrl,
            address,
            hasMap: DZEMAT_LOCATION?.mapsUrl,
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
