import { useMatches } from "react-router";

import { getSiteNameFromMatches } from "#app/lib/branding";

/**
 * Quiet bottom-of-page credit line. Kept minimal on purpose — the
 * community site doesn't need navigation down here, just a touch of
 * finality so content pages don't end abruptly.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const siteName = getSiteNameFromMatches(useMatches());

  return (
    <footer className="border-border/60 mt-16 border-t">
      <div className="text-muted-foreground mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-8 text-center text-sm">
        <p>
          &copy; {year} {siteName}
        </p>
      </div>
    </footer>
  );
}
