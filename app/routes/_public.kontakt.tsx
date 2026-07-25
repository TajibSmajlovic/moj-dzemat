import { href } from "react-router";

import { DzematLocationSection } from "#app/components/layout/dzemat-location-section";
import { PageMain } from "#app/components/layout/page-main";
import { ContactPageContent } from "#app/features/contact/components/contact-page-content";
import { getPublicCommunityInfo } from "#app/features/contact/contact.server";
import {
  formatPageTitle,
  getRootSiteName,
  getRootSiteUrl,
  useRootSiteName,
} from "#app/lib/branding";
import { getDzematLocation } from "#app/lib/maps";
import {
  ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  buildPublicPageMeta,
  formatDefaultSocialImageAlt,
  getDefaultSocialImageUrl,
} from "#app/lib/seo";
import { absoluteUrl } from "#app/lib/url";
import { env } from "#app/server/env.server";

import type { Route } from "./+types/_public.kontakt";

export function meta({ matches }: Route.MetaArgs) {
  const siteName = getRootSiteName(matches);
  const siteUrl = getRootSiteUrl(matches);
  const title = formatPageTitle("Kontakt", siteName);
  const description = `Informacije o ${siteName}, kontakt, imam, lokacija i podaci za uplatu.`;
  const canonical = siteUrl ? absoluteUrl(siteUrl, href("/kontakt")) : href("/kontakt");

  return buildPublicPageMeta({
    title,
    description,
    canonical,
    siteName,
    imageUrl: getDefaultSocialImageUrl(siteUrl),
    imageAlt: formatDefaultSocialImageAlt(siteName),
    robots: ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  });
}

export async function loader() {
  const environment = env();
  const info = await getPublicCommunityInfo();
  const location = info.showLocation
    ? getDzematLocation({
        address: environment.DZEMAT_ADDRESS,
        query: environment.DZEMAT_MAP_QUERY,
      })
    : null;

  return { info, location };
}

export default function KontaktPage({ loaderData }: Route.ComponentProps) {
  const { info, location } = loaderData;
  const siteName = useRootSiteName();

  return (
    <PageMain>
      <ContactPageContent info={info} />

      {info.showLocation && location ? (
        <DzematLocationSection location={location} siteName={siteName} />
      ) : null}
    </PageMain>
  );
}
