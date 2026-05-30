import { Outlet } from "react-router";

import { SiteFooter } from "#app/components/layout/site-footer";
import { SiteHeader } from "#app/components/layout/site-header";
import { AnnouncementBar } from "#app/features/announcements/components/announcement-bar";
import { getActiveAnnouncement } from "#app/features/announcements/site-announcement.server";
import { getCurrentUser } from "#app/features/auth/auth.server";
import { ROUTES } from "#app/lib/routes";
import { env } from "#app/server/env.server";

import type { Route } from "./+types/_public";

export async function loader({ request }: Route.LoaderArgs) {
  const environment = env();

  const [announcement, currentUser] = await Promise.all([
    getActiveAnnouncement(),
    getCurrentUser(request),
  ]);

  return {
    announcement,
    cloudflareWebAnalyticsToken: environment.CLOUDFLARE_WEB_ANALYTICS_TOKEN,
    isAdminLoggedIn: currentUser !== null,
  };
}

export default function PublicLayout({ loaderData }: Route.ComponentProps) {
  return (
    <div className="bg-background text-foreground relative flex min-h-screen flex-col">
      <AnnouncementBar announcement={loaderData.announcement} />
      <SiteHeader adminHref={loaderData.isAdminLoggedIn ? ROUTES.admin : ROUTES.login} />

      <div className="flex-1">
        <Outlet />
      </div>

      <SiteFooter />

      {loaderData.cloudflareWebAnalyticsToken ? (
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({
            token: loaderData.cloudflareWebAnalyticsToken,
          })}
        />
      ) : null}
    </div>
  );
}
