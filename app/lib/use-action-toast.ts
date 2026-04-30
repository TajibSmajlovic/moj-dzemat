import { useEffect, useRef } from "react";

import { showToast } from "#app/components/ui/sonner";
import type { Toast } from "#app/lib/toast";

type ToastEnvelope = { ok?: unknown; toast?: unknown };

function hasSuccessToast(value: unknown): value is { ok: true; toast: Toast } {
  if (!value || typeof value !== "object") return false;
  const envelope = value as ToastEnvelope;
  return envelope.ok === true && typeof envelope.toast === "object" && envelope.toast !== null;
}

/**
 * Show a toast exactly once when `actionData` flips to a new
 * `{ ok: true, toast }` payload. Identity comparison against the last
 * seen value prevents the toast from re-firing on re-renders.
 *
 * Use this for `useActionData()` results and other action-shaped
 * payloads. For `useFetcher`, prefer `useFetcherToast`.
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
