import { useRootLoaderData } from "#app/lib/root-loader-data";

export type SocialLinkPlatform = "facebook" | "youtube";

export type SocialLink = {
  platform: SocialLinkPlatform;
  label: string;
  href: string;
};

export function useRootSocialLinks(): SocialLink[] {
  const data = useRootLoaderData();
  const links: SocialLink[] = [];

  if (data?.facebookPageUrl) {
    links.push({ platform: "facebook", label: "Facebook", href: data.facebookPageUrl });
  }

  if (data?.youtubeChannelUrl) {
    links.push({ platform: "youtube", label: "YouTube", href: data.youtubeChannelUrl });
  }

  return links;
}

export function useRootSocialProfileUrls(): string[] {
  return useRootSocialLinks().map((link) => link.href);
}
