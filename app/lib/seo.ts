export const THEME_COLOR = "#1a4737";
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

export function absoluteSiteUrl(siteUrl: string | undefined, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return siteUrl ? `${siteUrl}${normalizedPath}` : normalizedPath;
}

export function getDefaultSocialImageUrl(siteUrl?: string): string {
  return absoluteSiteUrl(siteUrl, DEFAULT_SOCIAL_IMAGE.path);
}

export function formatDefaultSocialImageAlt(siteName: string): string {
  return `${siteName} - nova online platforma za džemat`;
}

export function buildSocialMeta({
  title,
  description,
  imageUrl,
  imageAlt,
  imageWidth = DEFAULT_SOCIAL_IMAGE.width,
  imageHeight = DEFAULT_SOCIAL_IMAGE.height,
}: SocialMetaArgs) {
  return [
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:alt", content: imageAlt },
    { property: "og:image:width", content: String(imageWidth) },
    { property: "og:image:height", content: String(imageHeight) },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
    { name: "twitter:image:alt", content: imageAlt },
  ];
}

export function jsonLdScriptContent(value: unknown): string {
  return JSON.stringify(value).replaceAll("</", String.raw`<\/`);
}
