import { useMatches } from "react-router";

import { getSiteNameFromMatches } from "#app/lib/branding";

export function SiteFooter() {
  const siteName = getSiteNameFromMatches(useMatches());

  return (
    <footer className="border-border/60 mt-16 border-t">
      <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col items-center justify-center gap-2 px-4 py-8 text-center text-sm">
        <p>&copy; {siteName}</p>
        <span className="text-muted-foreground hidden text-xs sm:block">
          Rijaset Islamske Zajednice u Bosni i Hercegovini
        </span>
        <span className="text-muted-foreground block text-xs sm:block">Mufijstvo Sarajevsko</span>
        <span className="text-muted-foreground block text-xs sm:block">
          Medzlis Islamske Zajednice Visoko
        </span>
      </div>
    </footer>
  );
}
