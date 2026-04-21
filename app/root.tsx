import { Links, Meta, Outlet, Scripts, ScrollRestoration, data, useLoaderData } from "react-router";

import interLatinExtWghtNormal from "@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2?url";
import interLatinWghtNormal from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import loraLatinExtWghtNormal from "@fontsource-variable/lora/files/lora-latin-ext-wght-normal.woff2?url";
import loraLatinWghtNormal from "@fontsource-variable/lora/files/lora-latin-wght-normal.woff2?url";

import { RootErrorBoundary } from "#app/components/layout/root-error-boundary";
import { Toaster, useToast } from "#app/components/ui/sonner";
import { formatSiteName, getSiteNameFromRootData } from "#app/lib/branding";
import { env } from "#app/utils/env.server";
import { getToast } from "#app/utils/toast.server";

import type { Route } from "./+types/root";
import "./styles/tailwind.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg?v=3", type: "image/svg+xml" },
  { rel: "icon", href: "/favicon.ico?v=3", sizes: "any" },
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

export function meta({ data }: Route.MetaArgs) {
  const siteName = getSiteNameFromRootData(data);
  const siteUrl = data?.siteUrl;
  const canonical = siteUrl ? `${siteUrl}/` : "/";

  return [
    { title: siteName },
    {
      name: "description",
      content: "Obavijesti, smrtovnice, sergije i hutbe džemata na jednom mjestu.",
    },
    { property: "og:title", content: siteName },
    {
      property: "og:description",
      content: "Obavijesti, smrtovnice, sergije i hutbe džemata na jednom mjestu.",
    },
    { property: "og:type", content: "website" },
    ...(siteUrl ? [{ property: "og:url", content: canonical }] : []),
    { name: "theme-color", content: "#1a4737" },
    { property: "og:site_name", content: siteName },
    { property: "og:locale", content: "bs_BA" },
    ...(siteUrl ? [{ tagName: "link", rel: "canonical", href: canonical }] : []),
  ];
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

  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RootErrorBoundary error={error} />;
}
