import type { IntentOf } from "#app/lib/intent";

export const ImportantDateIntents = {
  Create: "create",
  Update: "update",
  Delete: "delete",
} as const;

export type ImportantDateIntent = IntentOf<typeof ImportantDateIntents>;
