import { useMatches } from "react-router";

import { IslamskaZajednicaLogo } from "#app/components/layout/islamska-zajednica-logo.js";
import { getSiteNameFromMatches } from "#app/lib/branding";

export function SiteFooter() {
  const siteName = getSiteNameFromMatches(useMatches());

  return (
    <footer className="border-border/60 mt-8 border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-8 text-center sm:items-start sm:text-left">
        <div className="flex items-center gap-2.5">
          <IslamskaZajednicaLogo />
          <p className="text-foreground text-sm font-medium">&copy; {siteName}</p>
        </div>

        <p className="text-muted-foreground max-w-full text-xs leading-6 lg:whitespace-nowrap">
          Džemat Donje Mostre djeluje u okviru{" "}
          <a
            href="https://islamskazajednica.ba/"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:text-primary/80 focus-visible:ring-ring rounded-sm font-medium underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Rijaseta Islamske zajednice u Bosni i Hercegovini
          </a>{" "}
          <span className="text-primary/50" aria-hidden="true">
            /
          </span>{" "}
          <a
            href="https://muftijstvosarajevsko.ba/"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:text-primary/80 focus-visible:ring-ring rounded-sm font-medium underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Muftijstva sarajevskog
          </a>{" "}
          <span className="text-primary/50" aria-hidden="true">
            /
          </span>{" "}
          <a
            href="https://muftijstvosarajevsko.ba/medzlis-islamske-zajednice-visoko/"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:text-primary/80 focus-visible:ring-ring rounded-sm font-medium underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Medžlisa Islamske zajednice Visoko
          </a>
        </p>
      </div>
    </footer>
  );
}
