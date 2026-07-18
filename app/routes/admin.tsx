import { Form, href, Link, NavLink, Outlet } from "react-router";

import {
  ArrowLeft,
  BellRing,
  CalendarDays,
  HelpCircle,
  LogOut,
  Newspaper,
  type LucideIcon,
} from "lucide-react";

import { IslamskaZajednicaLogo } from "#app/components/icons/islamska-zajednica-logo";
import { SegmentErrorBoundary } from "#app/components/layout/segment-error-boundary";
import { Button } from "#app/components/ui/button";
import { adminAuthMiddleware } from "#app/features/auth/admin-auth-middleware.server";
import { adminUserContext } from "#app/features/auth/auth-context";
import { countAdminQuestions } from "#app/features/qa/qa.server";
import { ThemeToggle } from "#app/features/theme/components/theme-toggle";
import { useRootSiteName } from "#app/lib/branding";
import { cn } from "#app/lib/cn";
import { ROBOTS_NOINDEX_NOFOLLOW, buildNoindexMeta } from "#app/lib/seo";
import { prisma } from "#app/server/db.server";

import type { Route } from "./+types/admin";

export function meta() {
  return buildNoindexMeta("Admin Panel", ROBOTS_NOINDEX_NOFOLLOW);
}

export const middleware: Route.MiddlewareFunction[] = [adminAuthMiddleware];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(adminUserContext);
  const [pendingQuestionCount, activeAnnouncementCount] = await Promise.all([
    countAdminQuestions("neodgovorena"),
    prisma.siteAnnouncement.count({ where: { isActive: true } }),
  ]);

  return {
    user: { email: user.email, name: user.name },
    pendingQuestionCount,
    hasActiveAnnouncement: activeAnnouncementCount > 0,
  };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { user, pendingQuestionCount, hasActiveAnnouncement } = loaderData;
  const siteName = useRootSiteName();

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border/60 bg-background/80 sticky top-0 z-30 border-b backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to={href("/")}
              aria-label="Nazad na javnu stranicu"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="flex items-center gap-3">
              <IslamskaZajednicaLogo />

              <div>
                <h1 className="font-display text-foreground text-lg leading-tight font-bold">
                  Admin Panel
                </h1>
                <p className="text-muted-foreground hidden max-w-[18rem] text-xs text-balance sm:block sm:max-w-none">
                  Upravljanje za {siteName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {user.name ?? user.email}
            </span>
            <ThemeToggle />
            <Form method="post" action={href("/odjava")}>
              <Button type="submit" variant="outline" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Odjava
              </Button>
            </Form>
          </div>
        </div>

        <nav
          aria-label="Admin sekcije"
          className="border-border/60 overflow-x-auto overflow-y-hidden border-t"
        >
          <div className="mx-auto flex w-full max-w-5xl gap-1 px-4">
            <div className="-ml-3 sm:-ml-4">
              <AdminTab to={href("/admin/objave")} label="Objave" icon={Newspaper} />
            </div>
            <AdminTab
              to={href("/admin/pitanja")}
              label="Pitanja"
              icon={HelpCircle}
              badgeCount={pendingQuestionCount}
              badgeLabel={`${pendingQuestionCount} neodgovorenih pitanja`}
            />
            <AdminTab to={href("/admin/vazni-datumi")} label="Važni datumi" icon={CalendarDays} />
            <AdminTab
              to={href("/admin/obavijesna-traka")}
              label="Obavijesna traka"
              icon={BellRing}
              activeIndicator={hasActiveAnnouncement ? "Aktivna" : null}
            />
          </div>
        </nav>
      </header>

      <Outlet />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <SegmentErrorBoundary
      error={error}
      tone="admin"
      backTo={href("/admin/objave")}
      backLabel="Nazad na listu objava"
    />
  );
}

function AdminTab({
  to,
  label,
  icon: Icon,
  badgeCount,
  badgeLabel,
  activeIndicator,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
  badgeLabel?: string;
  activeIndicator?: string | null;
}) {
  const showBadge = badgeCount !== undefined && badgeCount > 0;

  return (
    <NavLink
      to={to}
      aria-label={
        showBadge && badgeLabel
          ? `${label}, ${badgeLabel}`
          : activeIndicator
            ? `${label}, ${activeIndicator.toLowerCase()}`
            : undefined
      }
      className={({ isActive }) =>
        cn(
          "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4",
          isActive
            ? "border-primary text-primary"
            : "text-muted-foreground hover:text-foreground border-transparent",
        )
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
      {activeIndicator ? (
        <span
          className="bg-primary h-2 w-2 rounded-full"
          title={activeIndicator}
          aria-hidden="true"
        />
      ) : null}
      {showBadge ? (
        <span
          className="bg-primary/10 text-primary inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums"
          title={badgeLabel}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </NavLink>
  );
}
