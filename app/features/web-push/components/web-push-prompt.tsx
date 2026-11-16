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

  const eligible = eligibleRoute && eligibleState;

  useEffect(() => {
    if (!eligible || !canShowPrompt()) return;
    return watchInteraction(() => setInteracted(true));
  }, [eligible]);

  useEffect(() => {
    if (!eligible || !interacted || visible) return;

    const show = () => {
      if (!canShowPrompt()) return;
      sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(true);
    };
    return watchEngagement(show);
  }, [eligible, interacted, visible]);

  if (!visible || !eligible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSAL_KEY, String(Date.now() + DISMISSAL_MS));
    setVisible(false);
  };

  return <WebPushPromptView onDismiss={dismiss} />;
}

export function WebPushPromptView({ onDismiss }: { onDismiss: () => void }) {
  return (
    <aside className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-40 sm:right-auto sm:left-4 sm:w-[23rem]">
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="bg-background/80 absolute top-2 right-2 z-10 size-11 rounded-full"
          aria-label="Zatvori ponudu za obavijesti"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
        <WebPushCard
          compact
          onPrimaryAction={(currentState) => {
            if (currentState === "ready") onDismiss();
          }}
          onDismiss={onDismiss}
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

function canShowPrompt(): boolean {
  return !wasPromptDismissed() && !sessionStorage.getItem(SESSION_KEY);
}

function watchInteraction(markInteraction: () => void): () => void {
  const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
  for (const eventName of events)
    addEventListener(eventName, markInteraction, { once: true, passive: true });
  return () => {
    for (const eventName of events) removeEventListener(eventName, markInteraction);
  };
}

function watchEngagement(show: () => void): () => void {
  let remainingMs = ENGAGEMENT_MS;
  let startedAt = performance.now();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (timeout) clearTimeout(timeout);
    if (document.visibilityState !== "visible") {
      remainingMs = Math.max(0, remainingMs - (performance.now() - startedAt));
      return;
    }
    startedAt = performance.now();
    timeout = setTimeout(show, remainingMs);
  };

  schedule();
  document.addEventListener("visibilitychange", schedule);

  return () => {
    if (timeout) clearTimeout(timeout);
    document.removeEventListener("visibilitychange", schedule);
  };
}
