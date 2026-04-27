import { data } from "react-router";

import { ArrowRight, Clock3, ExternalLink, Inbox, Mail, RefreshCw } from "lucide-react";

import { Button } from "#app/components/ui/button";

import type { Route } from "./+types/dev.last-email";

export async function loader() {
  const [{ env }, { getLastCapturedEmail }] = await Promise.all([
    import("#app/utils/env.server"),
    import("#app/utils/email.server"),
  ]);

  if (!env().ENABLE_TEST_ROUTES) {
    throw new Response("Not found", { status: 404 });
  }

  const latestEmail = getLastCapturedEmail() ?? null;

  return data({
    latestEmail,
    latestResetUrl: extractResetUrl(latestEmail),
  });
}

export default function DevLastEmailPage({ loaderData }: Route.ComponentProps) {
  const { latestEmail, latestResetUrl } = loaderData;

  return (
    <main className="from-primary/6 via-background to-secondary/8 min-h-screen bg-linear-to-br">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 md:px-6">
        <section className="border-border/60 bg-card/95 relative w-full overflow-hidden rounded-4xl border shadow-sm backdrop-blur">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(26,71,55,0.14),transparent_70%)]" />

          <div className="relative flex flex-col gap-8 p-6 sm:p-8">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  <Inbox className="size-3.5" />
                  Dev inbox
                </div>
                <div className="space-y-2">
                  <h1 className="font-display text-foreground text-3xl font-semibold text-balance sm:text-4xl">
                    Zadnji email
                  </h1>
                  <p className="text-muted-foreground max-w-xl text-sm leading-6 sm:text-base">
                    Otvori posljednji captured email i, ako sadrži reset link, klikni direktno na
                    njega.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button asChild variant="secondary">
                  <a href="/dev/last-email">
                    <RefreshCw className="size-4" />
                    Osvježi
                  </a>
                </Button>
              </div>
            </header>

            {latestEmail ? (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoTile label="Subject" value={latestEmail.subject} />
                  <InfoTile
                    label="Primaoc"
                    value={latestEmail.to}
                    icon={<Mail className="size-4" />}
                  />
                  <InfoTile
                    label="Vrijeme"
                    value={formatCapturedAt(latestEmail.capturedAt)}
                    icon={<Clock3 className="size-4" />}
                  />
                  <InfoTile
                    label="Status"
                    value={latestResetUrl ? "Reset link prepoznat" : "Nema reset linka"}
                  />
                </div>

                <div className="from-primary/6 to-secondary/10 border-border/60 rounded-3xl border bg-linear-to-br p-5 sm:p-6">
                  <div className="mb-4 space-y-1">
                    <h2 className="text-foreground text-xl font-semibold">Reset link</h2>
                    <p className="text-muted-foreground text-sm leading-6">
                      Ovo je najbrži put za testiranje password reset flow-a.
                    </p>
                  </div>

                  {latestResetUrl ? (
                    <div className="space-y-4">
                      <div className="bg-background/90 border-border/60 rounded-2xl border p-4">
                        <p className="text-foreground text-sm leading-6 break-all">
                          {latestResetUrl}
                        </p>
                      </div>
                      <Button asChild size="lg" className="w-full sm:w-auto">
                        <a href={latestResetUrl}>
                          Otvori reset link
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-background/70 border-border/60 rounded-2xl border border-dashed p-4">
                      <p className="text-muted-foreground text-sm leading-6">
                        Zadnji email trenutno ne sadrži prepoznatljiv reset link. Pošalji novi
                        zahtjev za reset lozinke pa osvježi ovu stranicu.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h2 className="text-foreground text-sm font-semibold tracking-wide uppercase">
                    Sadržaj emaila
                  </h2>
                  <pre className="bg-muted/35 text-foreground overflow-x-auto rounded-3xl border border-transparent p-4 text-xs leading-6 whitespace-pre-wrap sm:p-5">
                    {latestEmail.text}
                  </pre>
                </div>
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function extractResetUrl(
  email: {
    text: string;
    html: string;
  } | null,
): string | null {
  if (!email) return null;

  const match = /https?:\/\/[^\s"'<>]*\/nova-lozinka\/[^\s"'<>]+/i.exec(
    `${email.text}\n${email.html}`,
  );
  return match?.[0] ?? null;
}

function formatCapturedAt(value: string | Date): string {
  const date = new Date(value);

  return new Intl.DateTimeFormat("bs-BA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-border/60 bg-background/80 rounded-2xl border p-4">
      <div className="text-muted-foreground mb-2 inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
        {icon ?? null}
        {label}
      </div>
      <p className="text-foreground text-sm font-medium wrap-break-word">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-border/60 bg-muted/25 rounded-3xl border border-dashed p-6 sm:p-8">
      <p className="text-foreground mb-2 text-lg font-semibold">Nema uhvaćenih emailova.</p>
      <p className="text-muted-foreground mb-5 text-sm leading-6">
        Pošalji zahtjev za reset lozinke, pa se vrati ovdje i klikni na osvježavanje.
      </p>
      <Button asChild>
        <a href="/zaboravljena-lozinka">
          Idi na zaboravljenu lozinku
          <ArrowRight className="size-4" />
        </a>
      </Button>
    </div>
  );
}
