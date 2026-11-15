import { href } from "react-router";

import { DzematLocationSection } from "#app/components/layout/dzemat-location-section";
import { PageMain } from "#app/components/layout/page-main";
import { ContactPageContent } from "#app/features/contact/components/contact-page-content";
import { getPublicCommunityInfo } from "#app/features/contact/contact.server";
import { formatPageTitle, SITE_NAME } from "#app/lib/branding";
import { DZEMAT_LOCATION } from "#app/lib/maps";
import { getRootSiteUrl } from "#app/lib/root-loader-data";
import {
  ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  buildPublicPageMeta,
  DEFAULT_SOCIAL_IMAGE,
  getDefaultSocialImageUrl,
} from "#app/lib/seo";
import { absoluteUrl } from "#app/lib/url";

import type { Route } from "./+types/_public.kontakt";

export function meta({ matches }: Route.MetaArgs) {
  const siteUrl = getRootSiteUrl(matches);
  const title = formatPageTitle("Kontakt");
  const description = `Informacije o ${SITE_NAME}, kontakt, imam, lokacija i podaci za uplatu.`;
  const canonical = siteUrl ? absoluteUrl(siteUrl, href("/kontakt")) : href("/kontakt");

  return buildPublicPageMeta({
    title,
    description,
    canonical,
    imageUrl: getDefaultSocialImageUrl(siteUrl),
    imageAlt: DEFAULT_SOCIAL_IMAGE.alt,
    robots: ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  });
}

export async function loader() {
  const info = await getPublicCommunityInfo();

  return { info };
}

export default function KontaktPage({ loaderData }: Route.ComponentProps) {
  const { info } = loaderData;

  return (
    <PageMain>
      <ContactPageContent info={info} />

      {info.showLocation && DZEMAT_LOCATION ? (
        <DzematLocationSection location={DZEMAT_LOCATION} />
      ) : null}
    </PageMain>
  );
}
