import { Link } from "react-router";

import { Eye, EyeOff, MessageCircle, Pencil } from "lucide-react";

import { AdminPanel } from "#app/components/admin/admin-panel";
import { DeleteRecordButton } from "#app/components/admin/delete-record-button";
import { EmptyState } from "#app/components/admin/empty-state";
import { IconActionButton } from "#app/components/admin/icon-action-button";
import { OptimisticToggleIconButton } from "#app/components/admin/optimistic-toggle-button";
import { PaginationControls } from "#app/components/admin/pagination-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#app/components/ui/table";
import { QaQuestionStatusBadge } from "#app/features/qa/admin/components/qa-question-status-badge";
import { QaAdminIntents } from "#app/features/qa/admin/qa-intents";
import type { AdminQuestionRow, AdminQuestionTab } from "#app/features/qa/qa.server";
import { cn } from "#app/lib/cn";
import { formatDateShort } from "#app/lib/date";
import { adminQaAnswerHref } from "#app/lib/routes";

type PaginationState = {
  page: number;
  totalPages: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
};

type QaAdminListProps = {
  questions: AdminQuestionRow[];
  tab: AdminQuestionTab;
  pagination: PaginationState;
  deletingId: string | null;
  getPageHref: (page: number) => string;
};

export function QaAdminList({
  questions,
  tab,
  pagination,
  deletingId,
  getPageHref,
}: QaAdminListProps) {
  if (questions.length === 0) {
    return (
      <EmptyState
        heading={tab === "neodgovorena" ? "Nema neodgovorenih pitanja" : "Nema odgovorenih pitanja"}
        description={
          tab === "neodgovorena"
            ? "Nova pitanja će se pojaviti ovdje kada ih džematlije pošalju."
            : "Odgovorena pitanja će se pojaviti ovdje nakon objave odgovora."
        }
      />
    );
  }

  return (
    <AdminPanel className="md:bg-card overflow-visible rounded-none border-0 bg-transparent shadow-none md:overflow-hidden md:rounded-2xl md:border md:shadow-sm">
      <div className="grid gap-3 md:hidden">
        {questions.map((question) => (
          <QuestionMobileCard
            key={question.id}
            question={question}
            tab={tab}
            deleting={deletingId === question.id}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Pitanje</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-32">Poslano</TableHead>
              <TableHead className="w-32">Odgovoreno</TableHead>
              <TableHead className="w-44 text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {questions.map((question) => (
              <TableRow
                key={question.id}
                className={deletingId === question.id ? "opacity-50" : undefined}
              >
                <TableCell className="max-w-0">
                  <p className="line-clamp-2 font-medium text-pretty">{question.question}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{questionMeta(question)}</p>
                </TableCell>

                <TableCell>
                  <QaQuestionStatusBadge question={question} />
                </TableCell>

                <TableCell className="text-muted-foreground text-sm">
                  {formatDateShort(question.createdAt)}
                </TableCell>

                <TableCell className="text-muted-foreground text-sm">
                  {question.answeredAt ? formatDateShort(question.answeredAt) : "—"}
                </TableCell>

                <TableCell>
                  <QuestionRowActions question={question} tab={tab} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        summary={`Prikaz ${pagination.rangeStart}-${pagination.rangeEnd} od ${pagination.totalItems} pitanja`}
        previousHref={getPageHref(pagination.page - 1)}
        nextHref={getPageHref(pagination.page + 1)}
        ariaLabel="Paginacija pitanja"
      />
    </AdminPanel>
  );
}

function QuestionMobileCard({
  question,
  tab,
  deleting,
}: {
  question: AdminQuestionRow;
  tab: AdminQuestionTab;
  deleting: boolean;
}) {
  return (
    <article
      className={cn(
        "border-border/70 bg-card min-w-0 rounded-xl border p-4 shadow-sm",
        deleting && "opacity-50",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <QaQuestionStatusBadge question={question} />
        <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
          Poslano {formatDateShort(question.createdAt)}
        </span>
      </div>

      <p className="font-display text-foreground mt-3 line-clamp-3 text-lg leading-tight font-semibold text-pretty">
        {question.question}
      </p>

      {question.answeredAt ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Odgovoreno {formatDateShort(question.answeredAt)}
        </p>
      ) : null}

      <div className="border-border/60 mt-4 border-t pt-3">
        <QuestionRowActions question={question} tab={tab} mobile />
      </div>
    </article>
  );
}

function QuestionRowActions({
  question,
  tab,
  mobile = false,
}: {
  question: AdminQuestionRow;
  tab: AdminQuestionTab;
  mobile?: boolean;
}) {
  const answered = question.answer !== null;
  const actionClassName = mobile ? "size-10 rounded-full" : undefined;

  return (
    <div
      className={
        mobile ? "flex flex-wrap items-center gap-2" : "flex items-center justify-end gap-1"
      }
    >
      <IconActionButton
        label={answered ? "Uredi" : "Odgovori"}
        tone="primary"
        className={actionClassName}
        asChild
      >
        <Link to={adminQaAnswerHref(question.id, { from: tab })}>
          {answered ? (
            <Pencil className="h-4 w-4" aria-hidden="true" />
          ) : (
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          )}
        </Link>
      </IconActionButton>

      {answered ? (
        <OptimisticToggleIconButton
          intent={QaAdminIntents.ToggleHidden}
          id={question.id}
          active={question.isHidden}
          tone="primary"
          activeLabel="Prikaži"
          inactiveLabel="Sakrij"
          activeIcon={<EyeOff className="h-4 w-4" aria-hidden="true" />}
          inactiveIcon={<Eye className="h-4 w-4" aria-hidden="true" />}
          className={actionClassName}
        />
      ) : null}

      <DeleteRecordButton
        id={question.id}
        formIdPrefix={mobile ? "delete-question-card" : "delete-question"}
        intent={QaAdminIntents.Delete}
        title="Obrisati pitanje?"
        description={
          <>
            Pitanje i eventualni odgovor će biti trajno uklonjeni. Ovu radnju nije moguće vratiti.
          </>
        }
        confirmLabel="Obriši pitanje"
        iconLabel="Obriši pitanje"
        className={actionClassName}
      />
    </div>
  );
}

function questionMeta(question: AdminQuestionRow) {
  if (question.answer === null) return "Čeka odgovor";
  if (question.isHidden) return "Sakriveno";

  return "Odgovor objavljen";
}
