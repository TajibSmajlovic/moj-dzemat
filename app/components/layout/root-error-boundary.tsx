import { isRouteErrorResponse, Link } from "react-router";

import { IslamskaZajednicaLogo } from "#app/components/icons/islamska-zajednica-logo";
import { useRootSiteName } from "#app/lib/branding";

export function RootErrorBoundary({ error }: { error: unknown }) {
  const siteName = useRootSiteName();
  let status = 500;
  let title = "Došlo je do greške";
  let message = "Dogodila se neočekivana greška. Pokušajte ponovo za koji trenutak.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    status = error.status;

    switch (error.status) {
      case 404: {
        {
          title = "Stranica nije pronađena";
          message = "Tražena stranica ne postoji ili je premještena.";
        }
        break;
      }
      case 403: {
        title = "Pristup odbijen";
        message = "Nemate dozvolu za pristup ovoj stranici.";
        break;
      }
      case 500: {
        title = "Interna greška servera";
        message = "Došlo je do greške na serveru. Pokušajte ponovo za koji trenutak.";
        break;
      }
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    message = error.message;
    stack = error.stack;
  }

  const is404 = status === 404;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(162_63%_28%/0.06)] blur-3xl" />
        <div className="absolute right-0 bottom-0 h-100 w-100 translate-x-1/3 translate-y-1/3 rounded-full bg-[hsl(38_60%_55%/0.05)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-md flex-col items-center gap-6 text-center">
        <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
          <IslamskaZajednicaLogo />
          <span>
            {siteName} · {status}
          </span>
        </span>

        {is404 ? (
          <p
            aria-hidden="true"
            className="font-display text-primary/10 text-[8rem] leading-none font-bold select-none"
          >
            404
          </p>
        ) : null}

        <h1 className="font-display text-foreground text-3xl text-balance sm:text-4xl">{title}</h1>

        <p className="text-muted-foreground max-w-sm leading-relaxed text-balance">{message}</p>

        <Link
          to="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-2 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Povratak na početnu
        </Link>
      </div>

      {stack ? (
        <pre className="border-border bg-card relative mx-auto mt-10 max-w-2xl overflow-x-auto rounded-lg border p-4 text-left text-xs shadow-sm">
          <code className="text-muted-foreground">{stack}</code>
        </pre>
      ) : null}
    </main>
  );
}
