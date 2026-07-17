export const ROUTES = {
  home: "/",
  posts: "/objave",
  images: "/slike",
  admin: "/admin",
  adminQa: "/admin/pitanja",
  adminPosts: "/admin/objave",
  adminPostNew: "/admin/objave/nova",
  adminAnnouncementBar: "/admin/obavijesna-traka",
  adminImportantDates: "/admin/vazni-datumi",
  qa: "/pitanja-i-odgovori",
  qaHvala: "/pitanja-i-odgovori/hvala",
  login: "/prijava",
  logout: "/odjava",
  forgotPassword: "/zaboravljena-lozinka",
  newPassword: "/nova-lozinka",
  devLastEmail: "/dev/last-email",
  robotsTxt: "/robots.txt",
  sitemapXml: "/sitemap.xml",
  healthcheck: "/resources/healthcheck",
  readiness: "/resources/readiness",
} as const;

export const DEFAULT_LOGGED_IN_REDIRECT = ROUTES.adminPosts;

export function absoluteUrl(siteUrl: string | undefined, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return siteUrl ? `${siteUrl.replace(/\/+$/, "")}${normalizedPath}` : normalizedPath;
}
