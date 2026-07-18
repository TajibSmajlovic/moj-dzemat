import { href, isRouteErrorResponse, Link } from "react-router";

import { AlertTriangle, ArrowLeft, FileQuestion } from "lucide-react";

import { Button } from "#app/components/ui/button";
import { cn } from "#app/lib/cn";

type SegmentTone = "public" | "admin";

type Props = {
  error: unknown;
  /**
     Public uses the full site chrome; admin lives inside the admin
     layout. The visual difference is small (rounded panel vs flush
     card) but the tone helps keep wording in sync with the surrounding
     page.
   */
  tone?: SegmentTone;
  /** Optional route the action button returns to. */
  backTo?: string;
  /** Label for the action button. */
  backLabel?: string;
  className?: string;
};

export function SegmentErrorBoundary({
  error,
  tone = "public",
  backTo = href("/"),
  backLabel = "Povratak na početnu",
  className,
}: Props) {
  let status = 500;
  let title = "Došlo je do greške";
  let message = "Dogodila se neočekivana greška u ovom dijelu stranice.";
  let detail: string | undefined;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (status === 404) {
      title = "Sadržaj nije pronađen";
      message = "Traženi sadržaj ne postoji ili je premješten.";
    } else if (status === 403) {
      title = "Pristup odbijen";
      message = "Nemate dozvolu za ovaj sadržaj.";
    } else if (status >= 500) {
      title = "Greška na serveru";
      message = "Pokušajte ponovo za koji trenutak.";
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    detail = error.message;
  }

  const isNotFound = status === 404;
  const Icon = isNotFound ? FileQuestion : AlertTriangle;

  return (
    <section
      role="alert"
      aria-live="polite"
      className={cn(
        "mx-auto my-8 w-full max-w-3xl px-4",
        tone === "admin" && "my-10 sm:my-12",
        className,
      )}
    >
      <div
        className={cn(
          "bg-card relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-7",
          isNotFound ? "border-primary/15" : "border-destructive/20",
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 top-0 h-1",
            isNotFound ? "bg-primary" : "bg-destructive",
          )}
        />
        <span
          aria-hidden="true"
          className="font-display text-muted pointer-events-none absolute top-5 right-5 hidden text-7xl leading-none font-bold select-none sm:block"
        >
          {status}
        </span>

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-2xl border sm:size-16",
              isNotFound
                ? "border-primary/15 bg-primary/10 text-primary"
                : "border-destructive/15 text-destructive",
            )}
          >
            <Icon className="size-7" />
          </span>

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "mb-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide uppercase",
                isNotFound ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
              )}
            >
              {isNotFound ? "Nije pronađeno" : "Greška"} · {status}
            </p>

            <h2 className="font-display text-foreground max-w-xl text-2xl leading-tight font-semibold text-balance sm:text-3xl">
              {title}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl leading-relaxed text-pretty">
              {message}
            </p>

            {detail ? (
              <pre className="border-border bg-muted/50 text-muted-foreground mt-5 overflow-x-auto rounded-lg border p-3 text-xs">
                <code>{detail}</code>
              </pre>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link to={backTo}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  {backLabel}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
