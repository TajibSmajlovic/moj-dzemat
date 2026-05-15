import { Outlet } from "react-router";

import { SiteFooter } from "#app/components/layout/site-footer";
import { SiteHeader } from "#app/components/layout/site-header";
import { AnnouncementBar } from "#app/components/posts/announcement-bar";
import { getCurrentUser } from "#app/utils/auth.server";
import { env } from "#app/utils/env.server";
import { getActiveAnnouncement } from "#app/utils/site-announcement.server";

import type { Route } from "./+types/_public";

export async function loader({ request }: Route.LoaderArgs) {
  const environment = env();
  const announcement = await getActiveAnnouncement();

  const currentUser = await getCurrentUser(request);

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
      <SiteHeader isAdminLoggedIn={loaderData.isAdminLoggedIn} />

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
