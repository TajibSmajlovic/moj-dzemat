import type { AdminQuestionTab } from "#app/features/qa/qa.server";
import { ROUTES } from "#app/lib/routes";

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
  return query ? `${ROUTES.adminQa}?${query}` : ROUTES.adminQa;
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

  return query ? `${ROUTES.adminQa}/${id}?${query}` : `${ROUTES.adminQa}/${id}`;
}

export function qaQuestionHref(id: string): string {
  return `${ROUTES.qa}/${id}`;
}

export function qaListHref({ page = 1 }: { page?: number } = {}): string {
  return page > 1 ? `${ROUTES.qa}?page=${page}` : ROUTES.qa;
}
