import { useMemo } from "react";
import type { Navigation } from "react-router";

/**
   Generic helpers for multi-action forms.

   Pattern:

     // 1. Declare the domain's intents once.
     export const PostAdminIntents = {
       Create: "create",
       Update: "update",
       Delete: "delete",
     } as const;
     export type PostAdminIntent = IntentOf<typeof PostAdminIntents>;

     // 2. In the form (typed hidden input):
     <IntentInput intent={PostAdminIntents.Delete} />

     // 3. In the action (parse once, then exhaustive switch):
     const intent = parseIntent(formData, PostAdminIntents);
     switch (intent) {
       case PostAdminIntents.Create: return ...;
       case PostAdminIntents.Update: return ...;
       case PostAdminIntents.Delete: return ...;
       default: assertUnreachable(intent);
     }

     // 4. In the component (pending state per intent):
     const deleting = useIsSubmittingIntent(navigation, PostAdminIntents.Delete);

   The helpers stay completely domain-agnostic, so every new form just
   declares its own `as const` intent map and gets the same parsing,
   exhaustiveness, and submission-state behaviour for free.
 */

const INTENT_FIELD = "intent";

export type IntentOf<T extends Record<string, string>> = T[keyof T];

type IntentMap = Record<string, string>;
type SubmissionNavigation = Pick<Navigation, "state" | "formData">;

function intentValues<T extends IntentMap>(intents: T): readonly string[] {
  return Object.values(intents);
}

function isIntent<T extends IntentMap>(value: unknown, intents: T): value is IntentOf<T> {
  return typeof value === "string" && (intentValues(intents) as string[]).includes(value);
}

export function parseIntent<T extends IntentMap>(
  formData: FormData,
  intents: T,
  field: string = INTENT_FIELD,
): IntentOf<T> {
  const raw = formData.get(field);
  if (isIntent(raw, intents)) return raw;
  throw new Response("Nepodržana radnja.", { status: 400 });
}

export function assertUnreachable(value: never): never {
  throw new Response(`Nepodržana radnja: ${String(value)}`, { status: 400 });
}

export function IntentInput<T extends string>({
  intent,
  field = INTENT_FIELD,
}: {
  intent: T;
  field?: string;
}) {
  return <input type="hidden" name={field} value={intent} />;
}

export function useIsSubmittingIntent<T extends string>(
  navigation: SubmissionNavigation,
  intent: T,
  field: string = INTENT_FIELD,
): boolean {
  return navigation.state === "submitting" && navigation.formData?.get(field) === intent;
}

export function useSubmittingRowId<T extends string>(
  navigation: SubmissionNavigation,
  intent: T,
  idField = "id",
  intentField: string = INTENT_FIELD,
): string | null {
  return useMemo(() => {
    if (navigation.formData?.get(intentField) !== intent) return null;

    const id = navigation.formData.get(idField);

    return typeof id === "string" ? id : null;
  }, [navigation.formData, intent, idField, intentField]);
}
