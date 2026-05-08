import { useState, type ComponentType, type SVGProps } from "react";
import { Link, useLocation } from "react-router";

import { ExternalLink, Home, LogIn, Menu, Newspaper, X, type LucideIcon } from "lucide-react";

import { FacebookIcon } from "#app/components/icons/facebook-icon";
import { IslamskaZajednicaLogo } from "#app/components/layout/islamska-zajednica-logo";
import { Button } from "#app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "#app/components/ui/sheet";
import { getSiteNameParts, useRootSiteName } from "#app/lib/branding";
import { cn } from "#app/lib/cn";
import { useRootFacebookPageUrl } from "#app/lib/social-links";

type NavIcon = ComponentType<SVGProps<SVGSVGElement>> | LucideIcon;
type InternalNavItem = {
  Icon: NavIcon;
  label: string;
  to: string;
  type: "internal";
};
type ExternalNavItem = {
  Icon: NavIcon;
  href: string;
  label: string;
  showExternalIcon?: boolean;
  type: "external";
};
type HeaderNavItem = InternalNavItem | ExternalNavItem;

const primaryNavItems: InternalNavItem[] = [
  { type: "internal", label: "Početna", to: "/", Icon: Home },
  { type: "internal", label: "Objave", to: "/objave", Icon: Newspaper },
];

export function SiteHeader({ isAdminLoggedIn = false }: { isAdminLoggedIn?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const siteName = useRootSiteName();
  const facebookPageUrl = useRootFacebookPageUrl();
  const { pathname } = useLocation();
  const adminHref = isAdminLoggedIn ? "/admin/objave" : "/prijava";
  const navItems = getHeaderNavItems({ adminHref, facebookPageUrl });

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="border-border/50 bg-background/85 sticky top-0 z-40 border-b backdrop-blur-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <BrandLink siteName={siteName} onClick={closeMenu} />

        <DesktopNavigation items={navItems} pathname={pathname} />

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="border-border bg-background text-foreground hover:bg-accent shrink-0 rounded-full lg:hidden"
            aria-expanded={menuOpen}
            aria-label="Otvori meni"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <SheetContent
            side="right"
            showCloseButton={false}
            className="border-border/70 bg-card w-[min(86vw,21rem)] gap-0 p-0 shadow-xl will-change-transform data-[state=closed]:duration-150 data-[state=closed]:ease-in data-[state=open]:duration-200 data-[state=open]:ease-out"
          >
            <SheetHeader className="border-border/60 border-b p-4">
              <SheetTitle className="sr-only">Glavna navigacija</SheetTitle>
              <SheetDescription className="sr-only">
                Linkovi za javne stranice, Facebook i administraciju.
              </SheetDescription>

              <div className="flex items-center justify-between gap-3">
                <BrandLink siteName={siteName} onClick={closeMenu} compact />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded-full border shadow-xs"
                  aria-label="Zatvori meni"
                  onClick={closeMenu}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </SheetHeader>

            <MobileNavigation items={navItems} pathname={pathname} onNavigate={closeMenu} />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function getHeaderNavItems({
  adminHref,
  facebookPageUrl,
}: {
  adminHref: string;
  facebookPageUrl: string | null;
}): HeaderNavItem[] {
  return [
    ...primaryNavItems,
    { type: "internal", label: "Admin", to: adminHref, Icon: LogIn },
    ...(facebookPageUrl
      ? [
          {
            type: "external" as const,
            label: "Facebook",
            href: facebookPageUrl,
            Icon: FacebookIcon,
            showExternalIcon: true,
          },
        ]
      : []),
  ];
}

function DesktopNavigation({ items, pathname }: { items: HeaderNavItem[]; pathname: string }) {
  return (
    <nav
      aria-label="Glavna navigacija"
      className="border-border/70 bg-card/75 hidden shrink-0 items-center gap-1 rounded-full border p-1 shadow-sm lg:flex"
    >
      {items.map((item) => (
        <DesktopNavItem key={getNavItemKey(item)} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

function MobileNavigation({
  items,
  onNavigate,
  pathname,
}: {
  items: HeaderNavItem[];
  onNavigate: () => void;
  pathname: string;
}) {
  return (
    <div className="p-3">
      <nav aria-label="Mobilna navigacija" className="space-y-2">
        {items.map((item) => (
          <MobileNavItem
            key={getNavItemKey(item)}
            item={item}
            onNavigate={onNavigate}
            pathname={pathname}
          />
        ))}
      </nav>
    </div>
  );
}

function BrandLink({
  compact = false,
  onClick,
  siteName,
}: {
  compact?: boolean;
  onClick?: () => void;
  siteName: string;
}) {
  const { brandName, dzematName } = getSiteNameParts(siteName);

  return (
    <Link
      to="/"
      aria-label={siteName}
      onClick={onClick}
      className="focus-visible:ring-ring flex min-w-0 items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:gap-3"
    >
      <IslamskaZajednicaLogo className={compact ? "h-9" : undefined} />
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "font-display leading-tight text-balance",
            compact ? "text-sm" : "max-w-56 text-base sm:max-w-none sm:text-lg",
          )}
        >
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
        {compact ? null : (
          <span className="text-muted-foreground mt-0.5 text-xs">
            <span className="max-[389px]:hidden">
              Rijaset Islamske zajednice u Bosni i Hercegovini
            </span>
            <span className="hidden max-[389px]:inline">Rijaset Islamske zajednice u BiH</span>
          </span>
        )}
      </span>
    </Link>
  );
}

function DesktopNavItem({ item, pathname }: { item: HeaderNavItem; pathname: string }) {
  const active = isNavItemActive(item, pathname);
  const className = cn(
    "focus-visible:ring-ring inline-flex h-9 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );

  if (item.type === "external") {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" className={className}>
        <NavItemContent item={item} iconClassName="h-4 w-4" />
      </a>
    );
  }

  return (
    <Link to={item.to} aria-current={active ? "page" : undefined} className={className}>
      <NavItemContent item={item} iconClassName="h-4 w-4" />
    </Link>
  );
}

function MobileNavItem({
  item,
  onNavigate,
  pathname,
}: {
  item: HeaderNavItem;
  onNavigate: () => void;
  pathname: string;
}) {
  const active = isNavItemActive(item, pathname);
  const className = cn(
    "focus-visible:ring-ring flex min-h-13 items-center gap-3 rounded-xl px-3.5 text-base font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "bg-muted/65 text-foreground hover:bg-accent hover:text-accent-foreground",
  );

  if (item.type === "external") {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        onClick={onNavigate}
        className={className}
      >
        <MobileNavItemContent item={item} active={active} />
      </a>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      <MobileNavItemContent item={item} active={active} />
    </Link>
  );
}

function MobileNavItemContent({ active, item }: { active: boolean; item: HeaderNavItem }) {
  return (
    <>
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full",
          active ? "bg-primary-foreground/15" : "bg-background/85 text-muted-foreground",
        )}
      >
        <NavItemIcon Icon={item.Icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">{item.label}</span>
      {item.type === "external" && item.showExternalIcon ? (
        <ExternalLink className="text-muted-foreground h-4 w-4" aria-hidden="true" />
      ) : null}
    </>
  );
}

function NavItemContent({ iconClassName, item }: { iconClassName: string; item: HeaderNavItem }) {
  return (
    <>
      <NavItemIcon Icon={item.Icon} className={iconClassName} />
      {item.label}
      {item.type === "external" && item.showExternalIcon ? (
        <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
      ) : null}
    </>
  );
}

function NavItemIcon({ className, Icon }: { className: string; Icon: NavIcon }) {
  return <Icon className={className} aria-hidden="true" />;
}

function getNavItemKey(item: HeaderNavItem) {
  return item.type === "external" ? item.href : item.to;
}

function isNavItemActive(item: HeaderNavItem, pathname: string) {
  return item.type === "internal" && isActivePath(pathname, item.to);
}

function isActivePath(pathname: string, to: string) {
  if (to === "/") {
    return pathname === "/";
  }

  return pathname === to || pathname.startsWith(`${to}/`);
}
