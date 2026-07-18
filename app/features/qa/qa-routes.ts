import { href } from "react-router";

import type { AdminQuestionTab } from "#app/features/qa/qa.server";

export function adminQaHref({
  tab,
  page = 1,
}: {
  tab?: AdminQuestionTab;
  page?: number;
} = {}): string {
  const params = new URLSearchParams();

  if (tab && tab !== "neodgovorena") {
    params.set("tab", tab);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  const pathname = href("/admin/pitanja");

  return query ? `${pathname}?${query}` : pathname;
}

export function adminQaAnswerHref(
  id: string,
  {
    from,
  }: {
    from?: AdminQuestionTab;
  } = {},
): string {
  const params = new URLSearchParams();

  if (from) {
    params.set("from", from);
  }

  const query = params.toString();

  const pathname = href("/admin/pitanja/:id", { id });

  return query ? `${pathname}?${query}` : pathname;
}

export function qaQuestionHref(id: string): string {
  return href("/pitanja-i-odgovori/:id", { id });
}

export function qaListHref({ page = 1 }: { page?: number } = {}): string {
  const pathname = href("/pitanja-i-odgovori");

  return page > 1 ? `${pathname}?page=${page}` : pathname;
}
