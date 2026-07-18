import { href } from "react-router";

export function adminPostsPageHref(page: number): string {
  const pathname = href("/admin/objave");

  return page <= 1 ? pathname : `${pathname}?page=${page}`;
}

export function adminPostHref(id: string): string {
  return href("/admin/objave/:id", { id });
}

export function adminPostPreviewHref(id: string): string {
  return href("/admin/objave/:id/pregled", { id });
}

export function postHref(slug: string): string {
  return href("/objave/:slug", { slug });
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
  const pathname = href("/objave");

  return query ? `${pathname}?${query}` : pathname;
}

export function postImageHref(id: string): string {
  return href("/slike/:id", { id });
}
