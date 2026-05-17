export const ROUTES = {
  home: "/",
  posts: "/objave",
  images: "/slike",
  admin: "/admin",
  adminPosts: "/admin/objave",
  adminPostNew: "/admin/objave/nova",
  adminAnnouncementBar: "/admin/obavijesna-traka",
  login: "/prijava",
  logout: "/odjava",
  forgotPassword: "/zaboravljena-lozinka",
  newPassword: "/nova-lozinka",
  devLastEmail: "/dev/last-email",
  robotsTxt: "/robots.txt",
  sitemapXml: "/sitemap.xml",
  healthcheck: "/resources/healthcheck",
} as const;

export const DEFAULT_LOGGED_IN_REDIRECT = ROUTES.adminPosts;

export function absoluteUrl(siteUrl: string, path: string): string {
  return `${siteUrl}${path}`;
}

export function adminPostsPageHref(page: number): string {
  return page <= 1 ? ROUTES.adminPosts : `${ROUTES.adminPosts}?page=${page}`;
}

export function adminAnnouncementBarNewHref(): string {
  return `${ROUTES.adminAnnouncementBar}?new=1`;
}

export function adminAnnouncementBarEditHref(id: string): string {
  const params = new URLSearchParams({ edit: id });

  return `${ROUTES.adminAnnouncementBar}?${params.toString()}`;
}

export function adminPostHref(id: string): string {
  return `${ROUTES.adminPosts}/${id}`;
}

export function adminPostPreviewHref(id: string): string {
  return `${adminPostHref(id)}/pregled`;
}

export function postHref(slug: string): string {
  return `${ROUTES.posts}/${slug}`;
}

export function postsArchiveHref({
  activeType = "all",
  page = 1,
}: {
  activeType?: string;
  page?: number;
} = {}): string {
  const params = new URLSearchParams();

  if (activeType !== "all") {
    params.set("vrsta", activeType);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `${ROUTES.posts}?${query}` : ROUTES.posts;
}

export function postImageHref(id: string): string {
  return `${ROUTES.images}/${id}`;
}

export function passwordResetHref(token: string): string {
  return `${ROUTES.newPassword}/${token}`;
}
