import type { IntentOf } from "#app/lib/intent";

export const QaAdminIntents = {
  ToggleHidden: "toggle-hidden",
  Delete: "delete",
} as const;

export type QaAdminIntent = IntentOf<typeof QaAdminIntents>;
