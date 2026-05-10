import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type SVGProps,
} from "react";
import { Link, useLocation } from "react-router";

import { ExternalLink, Home, LogIn, Menu, Newspaper, X, type LucideIcon } from "lucide-react";

import { FacebookIcon } from "#app/components/icons/facebook-icon";
import { IslamskaZajednicaLogo } from "#app/components/layout/islamska-zajednica-logo";
import { Button } from "#app/components/ui/button";
import { getSiteNameParts, useRootSiteName } from "#app/lib/branding";
import { cn } from "#app/lib/cn";
import { useRootFacebookPageUrl } from "#app/lib/social-links";

type NavIcon = ComponentType<SVGProps<SVGSVGElement>> | LucideIcon;

type InternalNavItem = {
  type: "internal";
  label: string;
  to: string;
  Icon: NavIcon;
};

type ExternalNavItem = {
  type: "external";
  label: string;
  href: string;
  Icon: NavIcon;
  showExternalIcon?: boolean;
};

type HeaderNavItem = InternalNavItem | ExternalNavItem;

const PRIMARY_NAV_ITEMS: readonly InternalNavItem[] = [
  { type: "internal", label: "Početna", to: "/", Icon: Home },
  { type: "internal", label: "Objave", to: "/objave", Icon: Newspaper },
];

export function SiteHeader({ isAdminLoggedIn = false }: { isAdminLoggedIn?: boolean }) {
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuId = useId();
  const { pathname } = useLocation();

  const { menuOpen, toggleMenu, closeMenu } = useMobileMenu({ headerRef, pathname });

  const siteName = useRootSiteName();
  const facebookPageUrl = useRootFacebookPageUrl();
  const navItems = buildNavItems({
    adminHref: isAdminLoggedIn ? "/admin/objave" : "/prijava",
    facebookPageUrl,
  });

  return (
    <header
      ref={headerRef}
      className="border-border/50 bg-background/85 sticky top-0 z-40 border-b backdrop-blur-lg"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <BrandLink siteName={siteName} onClick={closeMenu} />

        <DesktopNavigation items={navItems} pathname={pathname} />

        <MobileMenuToggle controls={mobileMenuId} open={menuOpen} onToggle={toggleMenu} />
      </div>

      <div
        aria-hidden={!menuOpen}
        className={cn(
          "absolute inset-x-0 top-full grid px-4 pt-2 pb-4 transition-[grid-template-rows,opacity,transform] duration-300 ease-out lg:hidden",
          menuOpen
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none -translate-y-2 grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <MobileNavigation
            id={mobileMenuId}
            items={navItems}
            open={menuOpen}
            pathname={pathname}
            onNavigate={closeMenu}
          />
        </div>
      </div>
    </header>
  );
}

function BrandLink({ onClick, siteName }: { onClick?: () => void; siteName: string }) {
  const { brandName, dzematName } = getSiteNameParts(siteName);

  return (
    <Link
      to="/"
      aria-label={siteName}
      onClick={onClick}
      className="focus-visible:ring-ring flex min-w-0 items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:gap-3"
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
  );
}

function MobileMenuToggle({
  controls,
  onToggle,
  open,
}: {
  controls: string;
  open: boolean;
  onToggle: VoidFunction;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className={cn(
        "border-border bg-background hover:bg-accent relative shrink-0 overflow-hidden rounded-full transition-[background-color,color,box-shadow,transform] duration-300 lg:hidden",
        open && "bg-accent text-accent-foreground shadow-foreground/10 shadow-md",
      )}
      aria-controls={controls}
      aria-expanded={open}
      aria-label={open ? "Zatvori meni" : "Otvori meni"}
      onClick={onToggle}
    >
      <Menu
        className={cn(
          "absolute top-1/2 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out",
          open ? "scale-75 opacity-0" : "scale-100 opacity-100",
          open ? "rotate-90" : "rotate-0",
        )}
      />
      <X
        className={cn(
          "absolute top-1/2 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out",
          open ? "scale-100 opacity-100" : "scale-75 opacity-0",
          open ? "rotate-0" : "-rotate-90",
        )}
      />
    </Button>
  );
}

function DesktopNavigation({ items, pathname }: { items: HeaderNavItem[]; pathname: string }) {
  return (
    <nav
      aria-label="Glavna navigacija"
      className="border-border/70 bg-card/75 hidden shrink-0 items-center gap-1 rounded-full border p-1 shadow-sm lg:flex"
    >
      {items.map((item) => (
        <DesktopNavItem key={navItemKey(item)} item={item} pathname={pathname} />
      ))}
    </nav>
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

  const content = (
    <>
      <item.Icon className="h-4 w-4" aria-hidden="true" />
      {item.label}
      {item.type === "external" && item.showExternalIcon ? (
        <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
      ) : null}
    </>
  );

  if (item.type === "external") {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link to={item.to} aria-current={active ? "page" : undefined} className={className}>
      {content}
    </Link>
  );
}

function MobileNavigation({
  id,
  items,
  onNavigate,
  open,
  pathname,
}: {
  id: string;
  items: HeaderNavItem[];
  onNavigate: () => void;
  open: boolean;
  pathname: string;
}) {
  const primaryItems = items.filter((item): item is InternalNavItem => item.type === "internal");
  const externalItems = items.filter((item): item is ExternalNavItem => item.type === "external");

  return (
    <div
      className={cn(
        "bg-card/98 border-border/80 supports-backdrop-filter:bg-card/95 shadow-foreground/10 ring-border/70 mx-auto w-full max-w-5xl origin-top overflow-hidden rounded-2xl border p-3 shadow-2xl ring-1 backdrop-blur-xl transition-[box-shadow,transform] duration-300 ease-out",
        open ? "scale-100" : "scale-[0.98]",
      )}
    >
      <nav id={id} aria-label="Mobilna navigacija" className="grid">
        {primaryItems.map((item, index) => (
          <MobileNavItem
            key={navItemKey(item)}
            index={index}
            item={item}
            open={open}
            onNavigate={onNavigate}
            pathname={pathname}
          />
        ))}
      </nav>

      {externalItems.length > 0 ? (
        <div className="mt-5 flex justify-end gap-2 px-2 pb-1">
          {externalItems.map((item, index) => (
            <MobileSocialLink
              key={navItemKey(item)}
              index={primaryItems.length + index}
              item={item}
              open={open}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MobileNavItem({
  index,
  item,
  onNavigate,
  open,
  pathname,
}: {
  index: number;
  item: InternalNavItem;
  onNavigate: () => void;
  open: boolean;
  pathname: string;
}) {
  const active = isNavItemActive(item, pathname);

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-visible:ring-ring focus-visible:ring-offset-background text-foreground relative flex min-h-12 items-center rounded-xl px-4 text-base font-semibold transition-[background-color,color,opacity,transform] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
        active
          ? "text-primary after:bg-gold after:absolute after:right-4 after:bottom-0 after:left-4 after:h-0.5 after:origin-left after:scale-x-100 after:rounded-full after:transition-transform after:duration-300"
          : "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground",
      )}
      style={staggerStyle(index, open)}
      tabIndex={open ? undefined : -1}
    >
      {item.label}
    </Link>
  );
}

function MobileSocialLink({
  index,
  item,
  onNavigate,
  open,
}: {
  index: number;
  item: ExternalNavItem;
  onNavigate: () => void;
  open: boolean;
}) {
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noreferrer"
      onClick={onNavigate}
      className={cn(
        "focus-visible:ring-ring focus-visible:ring-offset-background text-muted-foreground hover:bg-accent/70 hover:text-primary flex h-10 w-10 items-center justify-center rounded-full transition-[background-color,color,opacity,transform] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
      )}
      style={staggerStyle(index, open)}
      tabIndex={open ? undefined : -1}
    >
      <span className="sr-only">{item.label}</span>
      <item.Icon className="h-5 w-5" aria-hidden="true" />
    </a>
  );
}

function useMobileMenu({
  headerRef,
  pathname,
}: {
  headerRef: React.RefObject<HTMLElement | null>;
  pathname: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close when navigating to a new route.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close on Escape and on pointer-down outside the header.
  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && !headerRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    }

    globalThis.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen, headerRef]);

  return {
    menuOpen,
    toggleMenu: () => setMenuOpen((open) => !open),
    closeMenu: () => setMenuOpen(false),
  };
}

function buildNavItems({
  adminHref,
  facebookPageUrl,
}: {
  adminHref: string;
  facebookPageUrl: string | null;
}): HeaderNavItem[] {
  const items: HeaderNavItem[] = [
    ...PRIMARY_NAV_ITEMS,
    { type: "internal", label: "Admin", to: adminHref, Icon: LogIn },
  ];

  if (facebookPageUrl) {
    items.push({
      type: "external",
      label: "Facebook",
      href: facebookPageUrl,
      Icon: FacebookIcon,
      showExternalIcon: true,
    });
  }

  return items;
}

function staggerStyle(index: number, open: boolean): CSSProperties {
  return { transitionDelay: open ? `${70 + index * 35}ms` : "0ms" };
}

function navItemKey(item: HeaderNavItem) {
  return item.type === "external" ? item.href : item.to;
}

function isNavItemActive(item: HeaderNavItem, pathname: string) {
  return item.type === "internal" && isActivePath(pathname, item.to);
}

function isActivePath(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}
