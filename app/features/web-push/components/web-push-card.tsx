import { useState } from "react";

import { Bell, BellOff, CircleAlert, LoaderCircle, Smartphone } from "lucide-react";

import { Button } from "#app/components/ui/button";
import { useWebPush, type WebPushState } from "#app/features/web-push/web-push";
import { cn } from "#app/lib/cn";

export function WebPushCard({
  compact = false,
  onPrimaryAction,
  onDismiss,
}: {
  compact?: boolean;
  onPrimaryAction?: (state: WebPushState) => void;
  onDismiss?: () => void;
}) {
  const { state, enable, disable, retry } = useWebPush();
  const [showIosHelp, setShowIosHelp] = useState(false);
  if (state === "initializing" || state === "hidden") return null;

  const content = stateContent(state);
  const busy = ["enabling", "synchronizing", "disabling"].includes(state);
  const primaryAction =
    state === "ready"
      ? { label: "Uključi obavijesti", run: enable }
      : state === "enable-failed"
        ? { label: "Pokušaj ponovo", run: enable }
        : state === "retry"
          ? { label: "Pokušaj ponovo", run: retry }
          : state === "install-required"
            ? { label: "Kako uključiti", run: () => setShowIosHelp((value) => !value) }
            : null;
  const canDisable = state === "enabled" || state === "paused" || state === "retry";

  return (
    <section
      aria-labelledby={compact ? "web-push-prompt-title" : "web-push-card-title"}
      className={cn(
        "border-border bg-card shadow-sm",
        compact ? "rounded-2xl border p-4 pr-14" : "rounded-2xl border p-4 sm:p-5",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary mt-0.5 grid size-10 shrink-0 place-items-center rounded-full">
          <StateIcon state={state} />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id={compact ? "web-push-prompt-title" : "web-push-card-title"}
            className="font-display text-foreground text-base font-semibold sm:text-lg"
          >
            {content.title}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {content.description}
          </p>

          {showIosHelp && state === "install-required" ? (
            <div className="bg-muted/60 text-foreground mt-3 rounded-xl p-3 text-sm leading-relaxed">
              U Safariju dodirnite <strong>Dijeli</strong>, zatim{" "}
              <strong>Dodaj na početni ekran</strong>. Otvorite Moj Džemat s početnog ekrana i ovdje
              uključite obavijesti.
            </div>
          ) : null}

          {primaryAction || canDisable || onDismiss ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {primaryAction ? (
                <Button
                  type="button"
                  size={compact ? "sm" : "default"}
                  onClick={() => {
                    onPrimaryAction?.(state);
                    void primaryAction.run();
                  }}
                  disabled={busy}
                  className="min-h-11 rounded-full px-5"
                >
                  {primaryAction.label}
                </Button>
              ) : null}
              {canDisable ? (
                <Button
                  type="button"
                  variant="outline"
                  size={compact ? "sm" : "default"}
                  onClick={() => void disable()}
                  disabled={busy}
                  className="min-h-11 rounded-full px-5"
                >
                  Isključi
                </Button>
              ) : null}
              {onDismiss ? (
                <Button
                  type="button"
                  variant="ghost"
                  size={compact ? "sm" : "default"}
                  onClick={onDismiss}
                  className="min-h-11 rounded-full px-4"
                >
                  Ne sada
                </Button>
              ) : null}
            </div>
          ) : null}

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {content.title}. {content.description}
          </p>
        </div>
      </div>
    </section>
  );
}

function stateContent(state: WebPushState): { title: string; description: string } {
  switch (state) {
    case "ready": {
      return {
        title: "Saznajte kada objavimo nešto novo",
        description: "Bez računa i bez praćenja otvaranja. Možete isključiti bilo kada.",
      };
    }
    case "enabled": {
      return {
        title: "Obavijesti su uključene na ovom uređaju",
        description: "Obavijestit ćemo vas samo o novim objavama.",
      };
    }
    case "paused": {
      return {
        title: "Obavijesti su privremeno pauzirane",
        description: "Slanje je trenutno isključeno, ali ovu pretplatu i dalje možete ukloniti.",
      };
    }
    case "enable-failed": {
      return {
        title: "Obavijesti nisu uključene",
        description:
          "Preglednik nije uspio povezati push servis. Provjerite postavke obavijesti preglednika pa pokušajte ponovo.",
      };
    }
    case "retry": {
      return {
        title: "Pretplatu treba ponovo povezati",
        description:
          "Obavijesti su uključene u pregledniku, ali povezivanje sa serverom nije uspjelo.",
      };
    }
    case "denied": {
      return {
        title: "Obavijesti su blokirane",
        description:
          "Dozvolite ih u postavkama preglednika ili uređaja, zatim ponovo otvorite ovu stranicu.",
      };
    }
    case "unsupported": {
      return {
        title: "Obavijesti nisu dostupne",
        description: "Ovaj preglednik ili aktivna verzija aplikacije još ne podržava Web Push.",
      };
    }
    case "install-required": {
      return {
        title: "Dodajte Moj Džemat na početni ekran",
        description:
          "Na iPhoneu i iPadu obavijesti rade kada aplikaciju otvorite s početnog ekrana.",
      };
    }
    case "enabling": {
      return { title: "Uključivanje obavijesti…", description: "Potvrdite dozvolu u pregledniku." };
    }
    case "synchronizing": {
      return { title: "Povezivanje uređaja…", description: "Ovo obično traje samo trenutak." };
    }
    case "disabling": {
      return {
        title: "Isključivanje obavijesti…",
        description: "Uklanjamo pretplatu s ovog uređaja.",
      };
    }
    default: {
      return { title: "Obavijesti", description: "" };
    }
  }
}

function StateIcon({ state }: { state: WebPushState }) {
  if (["enabling", "synchronizing", "disabling"].includes(state)) {
    return (
      <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
    );
  }
  if (state === "install-required") return <Smartphone className="size-5" aria-hidden="true" />;
  if (state === "denied" || state === "unsupported" || state === "enable-failed") {
    return <CircleAlert className="size-5" aria-hidden="true" />;
  }
  if (state === "paused") return <BellOff className="size-5" aria-hidden="true" />;
  return <Bell className="size-5" aria-hidden="true" />;
}
