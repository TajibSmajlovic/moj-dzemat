export const POST_STATUSES = ["draft", "published"] as const;

export type PostStatusValue = (typeof POST_STATUSES)[number];

export const POST_STATUS_LABEL: Record<PostStatusValue, string> = {
  draft: "Neobjavljeno",
  published: "Objavljeno",
};
