import { Link, redirect, useNavigation } from "react-router";

import { HelpCircle } from "lucide-react";

import { AdminPageHeader } from "#app/components/admin/admin-page-header";
import { Button } from "#app/components/ui/button";
import { useActionToast } from "#app/components/ui/sonner";
import { adminUserContext } from "#app/features/auth/auth-context";
import { QaAdminList } from "#app/features/qa/admin/components/qa-admin-list";
import { parseAdminQuestionTab } from "#app/features/qa/admin/qa-admin-tabs";
import {
  deleteAdminQuestion,
  getAdminQaCounts,
  getAdminQaListPage,
  toggleAdminQuestionHidden,
} from "#app/features/qa/admin/qa-admin.server";
import { QaAdminIntents, type QaAdminIntent } from "#app/features/qa/admin/qa-intents";
import { adminQaHref } from "#app/features/qa/qa-routes";
import { cn } from "#app/lib/cn";
import { requireId } from "#app/lib/id";
import { assertUnreachable, parseIntent, useSubmittingRowId } from "#app/lib/intent";
import { parsePageParam } from "#app/lib/pagination";

import type { Route } from "./+types/admin.pitanja._index";

export async function loader({ context, url }: Route.LoaderArgs) {
  context.get(adminUserContext);

  const tab = parseAdminQuestionTab(url.searchParams.get("tab"));
  const page = parsePageParam(url.searchParams.get("page"));
  const { questions, pagination } = await getAdminQaListPage({ tab, page });

  if (pagination.totalPages > 0 && page > pagination.totalPages) {
    return redirect(adminQaHref({ tab, page: pagination.totalPages }));
  }

  const counts = await getAdminQaCounts(tab, pagination.totalItems);

  return { tab, questions, pagination, counts };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = context.get(adminUserContext);
  const formData = await request.formData();
  const intent = parseIntent(formData, QaAdminIntents);
  const id = requireId(formData.get("id"));

  switch (intent) {
    case QaAdminIntents.ToggleHidden: {
      return toggleAdminQuestionHidden(id, user.id);
    }
    case QaAdminIntents.Delete: {
      return deleteAdminQuestion(id, user.id);
    }
    default: {
      assertUnreachable(intent);
    }
  }
}

export default function AdminQaIndex({ actionData, loaderData }: Route.ComponentProps) {
  const { tab, questions, pagination, counts } = loaderData;
  const navigation = useNavigation();
  const deletingId = useSubmittingRowId<QaAdminIntent>(navigation, QaAdminIntents.Delete);

  useActionToast(actionData);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AdminPageHeader
        title="Pitanja i odgovori"
        description="Pregledajte pristigla pitanja i objavite odgovore kada su spremni."
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 sm:justify-start">
        <TabPill
          to={adminQaHref({ tab: "neodgovorena" })}
          active={tab === "neodgovorena"}
          label="Neodgovorena"
          count={counts.pending}
        />
        <TabPill
          to={adminQaHref({ tab: "odgovorena" })}
          active={tab === "odgovorena"}
          label="Odgovorena"
          count={counts.answered}
        />
      </div>

      <QaAdminList
        questions={questions}
        tab={tab}
        pagination={pagination}
        deletingId={deletingId}
        getPageHref={(page) => adminQaHref({ tab, page })}
      />
    </main>
  );
}

function TabPill({
  to,
  active,
  label,
  count,
}: {
  to: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Button
      asChild
      variant={active ? "secondary" : "outline"}
      size="sm"
      className={cn(
        "gap-2 rounded-full px-3",
        active && "bg-primary/10 text-primary hover:bg-primary/15",
      )}
    >
      <Link to={to} prefetch="intent">
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
        {label}
        <span className="bg-background/80 text-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
          {count}
        </span>
      </Link>
    </Button>
  );
}
