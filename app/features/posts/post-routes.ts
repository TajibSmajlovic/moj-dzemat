import { ROUTES } from "#app/lib/routes";

export function adminPostsPageHref(page: number): string {
  return page <= 1 ? ROUTES.adminPosts : `${ROUTES.adminPosts}?page=${page}`;
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
