import { Link, useMatches } from "react-router";

import { LogIn } from "lucide-react";
import { motion } from "motion/react";

import { IslamskaZajednicaLogo } from "#app/components/layout/islamska-zajednica-logo.js";
import { getSiteNameFromMatches } from "#app/lib/branding";

export function SiteHeader({ isAdminLoggedIn = false }: { isAdminLoggedIn?: boolean }) {
  const siteName = getSiteNameFromMatches(useMatches());

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
          className="focus-visible:ring-ring flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:gap-3"
        >
          <IslamskaZajednicaLogo />
          <span className="flex flex-col leading-none">
            <span className="font-display text-foreground max-w-56 text-base font-bold text-balance sm:max-w-none sm:text-lg">
              {siteName}
            </span>
            <span className="text-muted-foreground -mt-0.5 text-xs">
              Rijaset Islamske zajednice u Bosni i Hercegovini
            </span>
          </span>
        </Link>

        <Link
          to={isAdminLoggedIn ? "/admin/objave" : "/prijava"}
          className="border-border text-muted-foreground hover:text-foreground hover:border-primary/30 focus-visible:ring-ring hidden items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:flex"
        >
          <LogIn className="h-4 w-4" />
          <span>Admin</span>
        </Link>
      </div>
    </motion.header>
  );
}
