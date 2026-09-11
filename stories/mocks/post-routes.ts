import image from "../fixtures/community.svg?url&no-inline";

export * from "../../app/features/posts/post-routes";

export function postImageHref(_id: string): string {
  return image;
}
