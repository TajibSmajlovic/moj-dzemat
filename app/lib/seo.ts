import { absoluteUrl } from "#app/lib/url";

export const THEME_COLOR = "#1a4737";
export const ROBOTS_MAX_IMAGE_PREVIEW_LARGE = "max-image-preview:large";
export const ROBOTS_NOINDEX = "noindex";
export const ROBOTS_NOINDEX_FOLLOW = "noindex,follow";
export const ROBOTS_NOINDEX_NOFOLLOW = "noindex,nofollow";

export const DEFAULT_SOCIAL_IMAGE = {
  path: "/social-card-default.jpg",
  width: 1200,
  height: 630,
} as const;

type SocialMetaArgs = {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
};

export type BreadcrumbListItem = {
  name: string;
  url: string;
};

type PublicPageMetaArgs = SocialMetaArgs & {
  canonical: string;
  siteName: string;
  ogType?: "website" | "article";
  robots?: string;
  socialTitle?: string;
};

export function getDefaultSocialImageUrl(siteUrl?: string): string {
  return absoluteUrl(siteUrl, DEFAULT_SOCIAL_IMAGE.path);
}

export function formatDefaultSocialImageAlt(siteName: string): string {
  return `${siteName} - nova online platforma za džemat`;
}

export function buildSocialMeta({
  title,
  description,
  imageUrl,
  imageAlt,
  imageWidth,
  imageHeight,
}: SocialMetaArgs) {
  const width = imageWidth ?? DEFAULT_SOCIAL_IMAGE.width;
  const height = imageHeight ?? DEFAULT_SOCIAL_IMAGE.height;

  return [
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:alt", content: imageAlt },
    { property: "og:image:width", content: String(width) },
    { property: "og:image:height", content: String(height) },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
    { name: "twitter:image:alt", content: imageAlt },
  ];
}

export function buildPublicPageMeta({
  title,
  description,
  canonical,
  siteName,
  imageUrl,
  imageAlt,
  imageWidth,
  imageHeight,
  ogType = "website",
  robots = ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  socialTitle = title,
}: PublicPageMetaArgs) {
  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: ogType },
    { property: "og:site_name", content: siteName },
    { property: "og:locale", content: "bs_BA" },
    { property: "og:url", content: canonical },
    ...buildSocialMeta({
      title: socialTitle,
      description,
      imageUrl,
      imageAlt,
      imageWidth,
      imageHeight,
    }),
    { name: "theme-color", content: THEME_COLOR },
    { tagName: "link", rel: "canonical", href: canonical },
    { name: "robots", content: robots },
  ];
}

export function buildNoindexMeta(title: string, robots = ROBOTS_NOINDEX) {
  return [{ title }, { name: "robots", content: robots }];
}

export function buildBreadcrumbListJsonLd(items: BreadcrumbListItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function jsonLdScriptContent(value: unknown): string {
  return JSON.stringify(value).replaceAll("</", String.raw`<\/`);
}
