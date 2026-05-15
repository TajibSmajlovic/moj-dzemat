import type { IntentOf } from "#app/lib/intent";

export const AnnouncementIntents = {
  Create: "create",
  Update: "update",
  Toggle: "toggle",
  Delete: "delete",
} as const;

export type AnnouncementIntent = IntentOf<typeof AnnouncementIntents>;
