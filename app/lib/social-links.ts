import { dzemat } from "#app/lib/branding";

export type SocialLinkPlatform = "facebook" | "youtube";

export type SocialLink = {
  platform: SocialLinkPlatform;
  label: string;
  href: string;
};

const SOCIAL_LINK_LABELS: Record<SocialLinkPlatform, string> = {
  facebook: "Facebook",
  youtube: "YouTube",
};

/** The džemat's configured official profiles, in display order. */
export const SOCIAL_LINKS: SocialLink[] = (["facebook", "youtube"] as const).flatMap((platform) => {
  const href = dzemat.socialLinks[platform];

  return href ? { platform, label: SOCIAL_LINK_LABELS[platform], href } : [];
});
