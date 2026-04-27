import { Link } from "react-router";

import { LogIn } from "lucide-react";
import { motion } from "motion/react";

import { FacebookIcon } from "#app/components/icons/facebook-icon";
import { IslamskaZajednicaLogo } from "#app/components/layout/islamska-zajednica-logo.js";
import { getSiteNameParts, useRootSiteName } from "#app/lib/branding";
import { useRootFacebookPageUrl } from "#app/lib/social-links";

export function SiteHeader({ isAdminLoggedIn = false }: { isAdminLoggedIn?: boolean }) {
  const siteName = useRootSiteName();
  const { brandName, dzematName } = getSiteNameParts(siteName);
  const facebookPageUrl = useRootFacebookPageUrl();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-border/50 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-lg"
    >
      <div className="mx-auto flex max-w-5xl items-end justify-between px-4 py-3 sm:py-4">
        <Link
          to="/"
          aria-label={siteName}
          className="focus-visible:ring-ring flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:gap-3"
        >
          <IslamskaZajednicaLogo />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="font-display max-w-56 text-base leading-tight text-balance sm:max-w-none sm:text-lg">
              <span className="text-foreground font-bold">{brandName}</span>
              {dzematName ? (
                <>
                  <span className="text-muted-foreground mx-1.5 font-medium" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-primary text-[0.92em] font-semibold">{dzematName}</span>
                </>
              ) : null}
            </span>
            <span className="text-muted-foreground mt-0.5 text-xs">
              <span className="max-[389px]:hidden">
                Rijaset Islamske zajednice u Bosni i Hercegovini
              </span>
              <span className="hidden max-[389px]:inline">Rijaset Islamske zajednice u BiH</span>
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2 self-start">
          {facebookPageUrl ? (
            <a
              href={facebookPageUrl}
              target="_blank"
              rel="noreferrer"
              className="border-border text-muted-foreground hover:text-primary hover:border-primary/30 focus-visible:ring-ring inline-flex h-9 w-9 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
            >
              <FacebookIcon className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Facebook</span>
            </a>
          ) : null}

          <Link
            to={isAdminLoggedIn ? "/admin/objave" : "/prijava"}
            className="border-border text-muted-foreground hover:text-foreground hover:border-primary/30 focus-visible:ring-ring hidden items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:flex"
          >
            <LogIn className="h-4 w-4" />
            <span>Admin</span>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
