import { useMatches } from "react-router";

import { getSiteNameFromMatches } from "#app/lib/branding";

export function SiteFooter() {
  const siteName = getSiteNameFromMatches(useMatches());

  return (
    <footer className="border-border/60 mt-16 border-t">
      <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col items-center justify-center gap-2 px-4 py-8 text-center text-sm">
        <p>&copy; {siteName}</p>
      </div>
    </footer>
  );
}
