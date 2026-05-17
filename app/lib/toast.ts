import { useEffect, useRef } from "react";

import { z } from "zod";

import { showToast } from "#app/components/ui/sonner";

const ToastToneSchema = z.enum(["neutral", "primary", "secondary", "destructive"]);
const _ToastActionSchema = z.enum([
  "message",
  "error",
  "create",
  "update",
  "feature",
  "pin",
  "activate",
  "delete",
]);

export const ToastSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  type: z.enum(["message", "success", "error"]).default("message"),
  tone: ToastToneSchema.optional(),
  title: z.string().optional(),
  description: z.string(),
});

export type Toast = z.infer<typeof ToastSchema>;
export type ToastInput = z.input<typeof ToastSchema>;
export type ToastTone = z.infer<typeof ToastToneSchema>;
export type ToastAction = z.infer<typeof _ToastActionSchema>;

const TOAST_TONE_BY_ACTION = {
  message: "neutral",
  error: "destructive",
  create: "primary",
  update: "primary",
  feature: "secondary",
  pin: "primary",
  activate: "primary",
  delete: "destructive",
} as const satisfies Record<ToastAction, ToastTone>;

function getToastToneForAction(action: ToastAction): ToastTone {
  return TOAST_TONE_BY_ACTION[action];
}

export function getToastTypeForAction(action: ToastAction): Toast["type"] {
  if (action === "error") return "error";
  if (action === "message") return "message";
  return "success";
}

export function resolveToastTone(input: Pick<ToastInput, "tone" | "type">): ToastTone {
  if (input.tone) return input.tone;
  if (input.type === "error") return "destructive";
  if (input.type === "success") return "primary";
  return "neutral";
}

export function createActionToast(args: {
  action: ToastAction;
  description: string;
  title?: string;
}): Toast {
  const { action, description, title } = args;

  return ToastSchema.parse({
    title,
    description,
    type: getToastTypeForAction(action),
    tone: getToastToneForAction(action),
  });
}

type ToastEnvelope = { ok?: unknown; toast?: unknown };

function hasSuccessToast(value: unknown): value is { ok: true; toast: Toast } {
  if (!value || typeof value !== "object") return false;

  const envelope = value as ToastEnvelope;

  return envelope.ok === true && typeof envelope.toast === "object" && envelope.toast !== null;
}

/**
   Show a toast exactly once when `actionData` flips to a new
   `{ ok: true, toast }` payload. Identity comparison against the last
   seen value prevents the toast from re-firing on re-renders.

   Use this for `useActionData()` results and other action-shaped
   payloads. For `useFetcher`, prefer `useFetcherToast`.
 */
export function useActionToast(actionData: unknown) {
  const lastSeen = useRef<unknown>(undefined);

  useEffect(() => {
    if (!actionData || actionData === lastSeen.current) return;
    if (hasSuccessToast(actionData)) {
      showToast(actionData.toast);
    }

    lastSeen.current = actionData;
  }, [actionData]);
}

export function useFetcherToast(fetcher: { data?: unknown }) {
  useActionToast(fetcher.data);
}
