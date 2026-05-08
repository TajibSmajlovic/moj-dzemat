import { useState } from "react";
import { Link, useLocation, useMatches } from "react-router";

import { ChevronDown, LogIn, Menu, Newspaper, X } from "lucide-react";
import { motion } from "motion/react";

import { IslamskaZajednicaLogo } from "#app/components/layout/islamska-zajednica-logo.js";
import { Button } from "#app/components/ui/button";
import { getSiteNameFromMatches } from "#app/lib/branding";

export function SiteHeader({ isAdminLoggedIn = false }: { isAdminLoggedIn?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const siteName = getSiteNameFromMatches(useMatches());
  const { pathname } = useLocation();
  const adminHref = isAdminLoggedIn ? "/admin/objave" : "/prijava";
  const objaveActive = pathname === "/objave";

  const closeMenu = () => setMenuOpen(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-border/50 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-xl"
    >
      <div className="mx-auto max-w-5xl px-4 py-3 sm:py-4">
        <div className="border-border/60 bg-card/70 shadow-card/40 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 backdrop-blur-sm sm:px-5">
          <Link
            to="/"
            className="focus-visible:ring-ring flex min-w-0 items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:gap-3"
          >
            <IslamskaZajednicaLogo />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="font-display text-foreground max-w-56 text-sm font-bold text-balance sm:max-w-none sm:text-lg">
                {siteName}
              </span>
              <span className="text-muted-foreground -mt-0.5 hidden text-xs sm:block">
                Rijaset Islamske zajednice u Bosni i Hercegovini
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              to="/objave"
              aria-current={objaveActive ? "page" : undefined}
              className={[
                "focus-visible:ring-ring inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                objaveActive
                  ? "border-primary/20 bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-background text-foreground hover:border-primary/30 hover:bg-accent",
              ].join(" ")}
            >
              <Newspaper className="h-4 w-4" />
              <span>Objave</span>
            </Link>

            <Link
              to={adminHref}
              className="border-border text-muted-foreground hover:text-foreground hover:border-primary/30 focus-visible:ring-ring inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <LogIn className="h-4 w-4" />
              <span>Admin</span>
            </Link>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-border bg-background text-foreground hover:bg-accent sm:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Zatvori meni" : "Otvori meni"}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        <motion.div
          initial={false}
          animate={
            menuOpen ? { opacity: 1, y: 0, height: "auto" } : { opacity: 0, y: -8, height: 0 }
          }
          transition={{ duration: 0.2 }}
          className="overflow-hidden sm:hidden"
        >
          <div
            id="mobile-nav"
            className="border-border/60 bg-card/95 mt-2 space-y-2 rounded-2xl border p-3 shadow-lg backdrop-blur-xl"
          >
            <Link
              to="/objave"
              onClick={closeMenu}
              className={[
                "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                objaveActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-foreground hover:bg-accent",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                Objave
              </span>
              <ChevronDown className="h-4 w-4 -rotate-90 opacity-70" />
            </Link>

            <Link
              to={adminHref}
              onClick={closeMenu}
              className="bg-muted text-foreground hover:bg-accent flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all"
            >
              <span className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Admin
              </span>
              <ChevronDown className="h-4 w-4 -rotate-90 opacity-70" />
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}
