import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type SVGProps,
} from "react";
import { href, Link, useLocation } from "react-router";

import {
  ContactRound,
  HelpCircle,
  Home,
  LockKeyhole,
  Menu,
  Newspaper,
  X,
  type LucideIcon,
} from "lucide-react";

import { FacebookIcon } from "#app/components/icons/facebook-icon";
import { IslamskaZajednicaLogo } from "#app/components/icons/islamska-zajednica-logo";
import { Button } from "#app/components/ui/button";
import { ThemeToggle } from "#app/features/theme/components/theme-toggle";
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
};

type HeaderNavItem = InternalNavItem | ExternalNavItem;

const PRIMARY_NAV_ITEMS: readonly InternalNavItem[] = [
  { type: "internal", label: "Početna", to: href("/"), Icon: Home },
  { type: "internal", label: "Objave", to: href("/objave"), Icon: Newspaper },
  { type: "internal", label: "Kontakt", to: href("/kontakt"), Icon: ContactRound },
  {
    type: "internal",
    label: "Pitanja i odgovori",
    to: href("/pitanja-i-odgovori"),
    Icon: HelpCircle,
  },
];

export function SiteHeader({ adminHref = href("/prijava") }: { adminHref?: string }) {
  const { pathname } = useLocation();
  const siteName = useRootSiteName();
  const facebookPageUrl = useRootFacebookPageUrl();
  const navItems = buildNavItems({ facebookPageUrl });

  // Reset menu state on route changes without a setState effect.
  return (
    <SiteHeaderContent
      key={pathname}
      adminHref={adminHref}
      navItems={navItems}
      pathname={pathname}
      siteName={siteName}
    />
  );
}

function SiteHeaderContent({
  adminHref,
  navItems,
  pathname,
  siteName,
}: {
  adminHref: string;
  navItems: HeaderNavItem[];
  pathname: string;
  siteName: string;
}) {
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuId = useId();
  const { menuOpen, toggleMenu, closeMenu } = useMobileMenu({ headerRef });

  return (
    <header
      ref={headerRef}
      className="border-border/50 bg-background/85 sticky top-0 z-40 border-b backdrop-blur-lg"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <BrandLink siteName={siteName} onClick={closeMenu} />

        <div className="flex shrink-0 items-center gap-2">
          <DesktopNavigation items={navItems} pathname={pathname} />
          <DesktopExternalLinks items={navItems} />
          <ThemeToggle />
          <DesktopAdminAccess href={adminHref} />
          <MobileMenuToggle controls={mobileMenuId} open={menuOpen} onToggle={toggleMenu} />
        </div>
      </div>

      <div
        aria-hidden={!menuOpen}
        className={cn(
          "absolute inset-x-0 top-full grid px-4 pt-2 pb-4 transition-[grid-template-rows,opacity,transform] duration-300 ease-out xl:hidden",
          menuOpen
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none -translate-y-2 grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <MobileNavigation
            id={mobileMenuId}
            adminHref={adminHref}
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

function BrandLink({ onClick, siteName }: { onClick?: VoidFunction; siteName: string }) {
  const { brandName, dzematName } = getSiteNameParts(siteName);

  return (
    <Link
      to={href("/")}
      aria-label={siteName}
      onClick={onClick}
      className="focus-visible:ring-ring flex min-w-0 items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:gap-3"
    >
      <IslamskaZajednicaLogo />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="font-display w-max max-w-56 text-base leading-tight text-balance sm:max-w-none sm:text-lg">
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
          <span className="max-[560px]:hidden">
            Rijaset Islamske zajednice u Bosni i Hercegovini
          </span>
          <span className="hidden max-[560px]:inline">Rijaset Islamske zajednice u BiH</span>
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
        "border-border bg-background hover:bg-accent relative shrink-0 overflow-hidden rounded-full transition-[background-color,color,box-shadow,transform] duration-300 xl:hidden",
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
  const primaryItems = items.filter((item): item is InternalNavItem => item.type === "internal");

  return (
    <nav
      aria-label="Glavna navigacija"
      className="border-border/70 bg-card/75 hidden shrink-0 items-center gap-1 rounded-full border p-1 shadow-sm xl:flex"
    >
      {primaryItems.map((item) => (
        <DesktopNavItem key={navItemKey(item)} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

function DesktopExternalLinks({ items }: { items: HeaderNavItem[] }) {
  const externalItems = items.filter((item): item is ExternalNavItem => item.type === "external");

  return externalItems.map((item) => (
    <Button
      asChild
      key={item.href}
      size="icon"
      variant="outline"
      className="border-border bg-background hover:bg-accent hidden rounded-full xl:inline-flex"
    >
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        title={item.label}
        aria-label={item.label}
      >
        <item.Icon className="h-4 w-4" aria-hidden="true" />
      </a>
    </Button>
  ));
}

function DesktopAdminAccess({ href }: { href: string }) {
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className="border-border bg-background hover:bg-accent hidden rounded-full xl:inline-flex"
    >
      <Link to={href} aria-label="Administracija" title="Administracija" prefetch="intent">
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Button>
  );
}

function DesktopNavItem({ item, pathname }: { item: InternalNavItem; pathname: string }) {
  const active = isNavItemActive(item, pathname);
  const className = cn(
    "focus-visible:ring-ring inline-flex h-9 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );

  return (
    <Link to={item.to} aria-current={active ? "page" : undefined} className={className}>
      <item.Icon className="h-4 w-4" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

function MobileNavigation({
  adminHref,
  id,
  items,
  onNavigate,
  open,
  pathname,
}: {
  adminHref: string;
  id: string;
  items: HeaderNavItem[];
  onNavigate: VoidFunction;
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

      <MobileAdminAccess
        href={adminHref}
        index={primaryItems.length}
        open={open}
        onNavigate={onNavigate}
      />

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

function MobileAdminAccess({
  href,
  index,
  onNavigate,
  open,
}: {
  href: string;
  index: number;
  onNavigate: VoidFunction;
  open: boolean;
}) {
  return (
    <div className="border-border/70 mt-3 border-t px-2 pt-3">
      <Link
        to={href}
        onClick={onNavigate}
        prefetch="intent"
        className={cn(
          "focus-visible:ring-ring focus-visible:ring-offset-background text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-[background-color,color,opacity,transform] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
        )}
        style={staggerStyle(index, open)}
        tabIndex={open ? undefined : -1}
      >
        <LockKeyhole className="text-primary h-4 w-4" aria-hidden="true" />
        Administracija
      </Link>
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
  onNavigate: VoidFunction;
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
  onNavigate: VoidFunction;
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

function useMobileMenu({ headerRef }: { headerRef: React.RefObject<HTMLElement | null> }) {
  const [menuOpen, setMenuOpen] = useState(false);

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

function buildNavItems({ facebookPageUrl }: { facebookPageUrl: string | null }): HeaderNavItem[] {
  const items: HeaderNavItem[] = [...PRIMARY_NAV_ITEMS];

  if (facebookPageUrl) {
    items.push({
      type: "external",
      label: "Facebook",
      href: facebookPageUrl,
      Icon: FacebookIcon,
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
  if (to === href("/")) return pathname === href("/");

  return pathname === to || pathname.startsWith(`${to}/`);
}
