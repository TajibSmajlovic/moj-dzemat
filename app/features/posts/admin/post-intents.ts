import type { IntentOf } from "#app/lib/intent";

export const PostAdminIntents = {
  Create: "create",
  Update: "update",
  Delete: "delete",
  ToggleStatus: "toggle-status",
  ToggleFeatured: "toggle-featured",
  TogglePinned: "toggle-pinned",
  DeleteImage: "delete-image",
} as const;

export type PostAdminIntent = IntentOf<typeof PostAdminIntents>;
