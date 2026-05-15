import type { IntentOf } from "./intent";

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

export const AnnouncementIntents = {
  Create: "create",
  Update: "update",
  Toggle: "toggle",
  Delete: "delete",
} as const;

export type AnnouncementIntent = IntentOf<typeof AnnouncementIntents>;
