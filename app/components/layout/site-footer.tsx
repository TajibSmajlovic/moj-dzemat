import { IslamskaZajednicaLogo } from "#app/components/layout/islamska-zajednica-logo";
import { getSiteNameParts, useRootSiteName } from "#app/lib/branding";

export function SiteFooter() {
  const siteName = useRootSiteName();
  const { brandName, dzematName } = getSiteNameParts(siteName);

  return (
    <footer className="border-border/60 mt-8 border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-4 px-4 py-10 sm:flex-row sm:justify-start">
        <IslamskaZajednicaLogo className="h-14 sm:h-12" />

        <div className="min-w-0 space-y-1.5 text-center sm:text-left">
          <p className="font-display text-foreground text-sm leading-tight sm:text-base">
            <span className="font-bold">&copy; {brandName}</span>
            {dzematName ? (
              <>
                <span className="text-muted-foreground mx-1.5 font-medium" aria-hidden="true">
                  ·
                </span>
                <span className="text-primary text-[0.94em] font-semibold">{dzematName}</span>
              </>
            ) : null}
          </p>

          <p className="text-muted-foreground max-w-full text-xs leading-relaxed lg:whitespace-nowrap">
            {dzematName ? (
              <>
                Džemat <span className="text-foreground/80 font-medium">{dzematName}</span> djeluje
                u okviru{" "}
              </>
            ) : (
              "Djeluje u okviru "
            )}
            <a
              href="https://islamskazajednica.ba/"
              target="_blank"
              rel="noreferrer noopener"
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
              rel="noreferrer noopener"
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
              rel="noreferrer noopener"
              className="text-primary hover:text-primary/80 focus-visible:ring-ring rounded-sm font-medium underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              Medžlisa Islamske zajednice Visoko
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
