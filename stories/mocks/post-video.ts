import image from "../fixtures/community.svg?url&no-inline";
import embed from "../fixtures/embed.html?url";

export * from "../../app/features/posts/post-video";
export function youtubeThumbnailUrl(_id: string): string {
  return image;
}
export function youtubeEmbedUrl(_id: string, _options?: { autoplay?: boolean }): string {
  return embed;
}
