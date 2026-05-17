import { Form, Link, NavLink, Outlet } from "react-router";

import { ArrowLeft, BellRing, LogOut, Newspaper, type LucideIcon } from "lucide-react";

import { IslamskaZajednicaLogo } from "#app/components/icons/islamska-zajednica-logo";
import { SegmentErrorBoundary } from "#app/components/layout/segment-error-boundary";
import { Button } from "#app/components/ui/button";
import { requireAdmin } from "#app/features/auth/auth.server";
import { ThemeToggle } from "#app/features/theme/components/theme-toggle";
import { useRootSiteName } from "#app/lib/branding";
import { cn } from "#app/lib/cn";
import { ROUTES } from "#app/lib/routes";

import type { Route } from "./+types/admin";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAdmin(request);

  return { user: { email: user.email, name: user.name } };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const siteName = useRootSiteName();

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border/60 bg-background/80 sticky top-0 z-30 border-b backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to={ROUTES.home}
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
            <Form method="post" action={ROUTES.logout}>
              <Button type="submit" variant="outline" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Odjava
              </Button>
            </Form>
          </div>
        </div>

        <nav aria-label="Admin sekcije" className="border-border/60 border-t">
          <div className="mx-auto flex max-w-5xl gap-1 px-4">
            <AdminTab to={ROUTES.adminPosts} label="Objave" icon={Newspaper} />
            <AdminTab to={ROUTES.adminAnnouncementBar} label="Obavijesna traka" icon={BellRing} />
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
      backTo={ROUTES.adminPosts}
      backLabel="Nazad na listu objava"
    />
  );
}

function AdminTab({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
          isActive
            ? "border-primary text-primary"
            : "text-muted-foreground hover:text-foreground border-transparent",
        )
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </NavLink>
  );
}
