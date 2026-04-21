import { Form, Link, NavLink, Outlet, useMatches } from "react-router";

import { ArrowLeft, BellRing, LogOut, Newspaper, type LucideIcon } from "lucide-react";

import { BrandMosqueMark } from "#app/components/layout/brand-mosque-mark";
import { Button } from "#app/components/ui/button";
import { getSiteNameFromMatches } from "#app/lib/branding";
import { cn } from "#app/lib/cn";
import { requireAdmin } from "#app/utils/auth.server";

import type { Route } from "./+types/admin";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAdmin(request);

  return { user: { email: user.email, name: user.name } };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const siteName = getSiteNameFromMatches(useMatches());

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border/60 bg-background/80 sticky top-0 z-30 border-b backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              aria-label="Nazad na javnu stranicu"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="flex items-center gap-3">
              <BrandMosqueMark variant="inline" className="h-7 w-7" />
              <div>
                <h1 className="font-display text-foreground text-lg leading-tight font-bold">
                  Admin Panel
                </h1>
                <p className="text-muted-foreground max-w-[18rem] text-xs text-balance sm:max-w-none">
                  Upravljanje za {siteName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {user.name ?? user.email}
            </span>
            <Form method="post" action="/odjava">
              <Button type="submit" variant="outline" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Odjava
              </Button>
            </Form>
          </div>
        </div>

        <nav aria-label="Admin sekcije" className="border-border/60 border-t">
          <div className="mx-auto flex max-w-5xl gap-1 px-4">
            <AdminTab to="/admin/objave" label="Objave" icon={Newspaper} />
            <AdminTab to="/admin/obavijesna-traka" label="Obavijesna traka" icon={BellRing} />
          </div>
        </nav>
      </header>

      <Outlet />
    </div>
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
