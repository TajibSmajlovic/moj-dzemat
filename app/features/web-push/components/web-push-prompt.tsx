import { useEffect, useState } from "react";
import { useLocation } from "react-router";

import { X } from "lucide-react";

import { Button } from "#app/components/ui/button";
import { WebPushCard } from "#app/features/web-push/components/web-push-card";
import { useWebPush } from "#app/features/web-push/web-push";

const SESSION_KEY = "mdz:web-push-prompt-shown:v1";
const DISMISSAL_KEY = "mdz:web-push-prompt-dismissed:v1";
const DISMISSAL_MS = 30 * 24 * 60 * 60 * 1000;
const ENGAGEMENT_MS = 15_000;

export function WebPushPrompt() {
  const { pathname } = useLocation();
  const { state } = useWebPush();
  const [visible, setVisible] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const eligibleRoute = pathname === "/" || /^\/objave\/[^/]+$/.test(pathname);
  const eligibleState = state === "ready" || state === "install-required";

  useEffect(() => {
    if (
      !eligibleRoute ||
      !eligibleState ||
      wasPromptDismissed() ||
      sessionStorage.getItem(SESSION_KEY)
    ) {
      return;
    }
    const markInteraction = () => setInteracted(true);
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    for (const eventName of events)
      globalThis.addEventListener(eventName, markInteraction, { once: true, passive: true });
    return () => {
      for (const eventName of events) globalThis.removeEventListener(eventName, markInteraction);
    };
  }, [eligibleRoute, eligibleState]);

  useEffect(() => {
    if (!eligibleRoute || !eligibleState || !interacted || visible) return;

    let remainingMs = ENGAGEMENT_MS;
    let startedAt = performance.now();
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const show = () => {
      if (wasPromptDismissed() || sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(true);
    };
    const schedule = () => {
      if (timeout) globalThis.clearTimeout(timeout);
      if (document.visibilityState !== "visible") {
        remainingMs = Math.max(0, remainingMs - (performance.now() - startedAt));
        return;
      }
      startedAt = performance.now();
      timeout = globalThis.setTimeout(show, remainingMs);
    };

    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      if (timeout) globalThis.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [eligibleRoute, eligibleState, interacted, visible]);

  if (!visible || !eligibleRoute || !eligibleState) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSAL_KEY, String(Date.now() + DISMISSAL_MS));
    setVisible(false);
  };

  return (
    <aside className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-40 sm:right-auto sm:left-4 sm:w-[23rem]">
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={dismiss}
          className="bg-background/80 absolute top-2 right-2 z-10 size-11 rounded-full"
          aria-label="Zatvori ponudu za obavijesti"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
        <WebPushCard
          compact
          onPrimaryAction={(currentState) => {
            if (currentState === "ready") dismiss();
          }}
          onDismiss={dismiss}
        />
      </div>
    </aside>
  );
}

function wasPromptDismissed(): boolean {
  const value = Number(localStorage.getItem(DISMISSAL_KEY));
  if (!Number.isFinite(value) || value <= Date.now()) {
    localStorage.removeItem(DISMISSAL_KEY);
    return false;
  }
  return true;
}
