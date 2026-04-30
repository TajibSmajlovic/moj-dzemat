import { Links, Meta, Outlet, Scripts, ScrollRestoration, data, useLoaderData } from "react-router";

import interLatinExtWghtNormal from "@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2?url";
import interLatinWghtNormal from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import loraLatinExtWghtNormal from "@fontsource-variable/lora/files/lora-latin-ext-wght-normal.woff2?url";
import loraLatinWghtNormal from "@fontsource-variable/lora/files/lora-latin-wght-normal.woff2?url";
import { MotionConfig } from "motion/react";

import { RootErrorBoundary } from "#app/components/layout/root-error-boundary";
import { Toaster, useToast } from "#app/components/ui/sonner";
import { formatSiteName } from "#app/lib/branding";
import { env } from "#app/utils/env.server";
import { getToast } from "#app/utils/toast.server";

import type { Route } from "./+types/root";
import "./styles/tailwind.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon-32x32.png?v=1", type: "image/png", sizes: "32x32" },
  { rel: "icon", href: "/logo.png?v=1", type: "image/png", sizes: "512x512" },
  { rel: "icon", href: "/logo.svg?v=7", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=1" },
  {
    rel: "preload",
    href: interLatinWghtNormal,
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: interLatinExtWghtNormal,
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: loraLatinWghtNormal,
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: loraLatinExtWghtNormal,
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { toast, headers } = await getToast(request);
  const environment = env();

  return data(
    {
      siteName: formatSiteName(environment.DZEMAT_NAME),
      siteUrl: environment.APP_URL,
      facebookPageUrl: environment.FACEBOOK_PAGE_URL,
      toast,
    },
    {
      headers: headers ?? undefined,
    },
  );
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bs-BA">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { toast } = useLoaderData<typeof loader>();
  useToast(toast);

  return (
    <MotionConfig reducedMotion="user">
      <Outlet />
    </MotionConfig>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RootErrorBoundary error={error} />;
}
