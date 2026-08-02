import { Link } from "react-router";

import { CalendarOff, Pencil, RefreshCw } from "lucide-react";

import { AdminPanel } from "#app/components/admin/admin-panel";
import { DeleteRecordButton } from "#app/components/admin/delete-record-button";
import { EmptyState } from "#app/components/admin/empty-state";
import { IconActionButton } from "#app/components/admin/icon-action-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#app/components/ui/table";
import { ImportantDateIntents } from "#app/features/important-dates/admin/important-date-intents";
import { cn } from "#app/lib/cn";
import {
  dateToYmd,
  formatYmdDayMonth,
  formatYmdLong,
  getTodayYmd,
  ymdWithYear,
} from "#app/lib/date";

export type ImportantDateRow = {
  id: string;
  title: string;
  date: Date;
  description: string | null;
  recursYearly: boolean;
  createdAt: Date;
};

type Props = {
  importantDates: ImportantDateRow[];
  deletingId: string | null;
  getEditHref: (id: string) => string;
};

export function ImportantDateList({ importantDates, deletingId, getEditHref }: Props) {
  if (importantDates.length === 0) {
    return (
      <EmptyState>
        <p className="text-muted-foreground">
          Još nema važnih datuma. Kliknite 'Novi datum' za početak.
        </p>
      </EmptyState>
    );
  }

  // Compare calendar days as strings (YYYY-MM-DD sorts lexicographically),
  // so "past" matches the same UTC-midnight boundary used on the server.
  const todayYmd = getTodayYmd();

  return (
    <AdminPanel className="md:bg-card overflow-visible rounded-none border-0 bg-transparent shadow-none md:overflow-hidden md:rounded-2xl md:border md:shadow-sm">
      <div className="grid gap-3 md:hidden">
        {importantDates.map((importantDate) => (
          <ImportantDateMobileCard
            key={importantDate.id}
            importantDate={importantDate}
            status={getImportantDateStatus(importantDate, todayYmd)}
            todayYmd={todayYmd}
            deleting={deletingId === importantDate.id}
            getEditHref={getEditHref}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-100">Datum</TableHead>
              <TableHead>Naslov</TableHead>
              <TableHead>Opis</TableHead>
              <TableHead className="w-32 text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {importantDates.map((importantDate) => {
              const ymd = dateToYmd(importantDate.date);
              const status = getImportantDateStatus(importantDate, todayYmd);

              return (
                <TableRow
                  key={importantDate.id}
                  className={deletingId === importantDate.id ? "opacity-50" : undefined}
                >
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <time dateTime={ymd} className="text-foreground text-sm font-medium">
                        {formatImportantDate(importantDate, todayYmd)}
                      </time>
                      {importantDate.recursYearly ? <YearlyBadge /> : null}
                      {status === "past" ? <PastBadge label="Prošlo" /> : null}
                      {status === "past-this-year" ? <PastBadge label="Prošlo ove godine" /> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={getEditHref(importantDate.id)}
                      className="hover:text-primary line-clamp-2 text-left font-medium transition-colors"
                    >
                      {importantDate.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs text-sm">
                    {importantDate.description ? (
                      <span className="line-clamp-2">{importantDate.description}</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <ImportantDateActions importantDate={importantDate} getEditHref={getEditHref} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AdminPanel>
  );
}

function ImportantDateMobileCard({
  importantDate,
  status,
  todayYmd,
  deleting,
  getEditHref,
}: {
  importantDate: ImportantDateRow;
  status: ImportantDateStatus;
  todayYmd: string;
  deleting: boolean;
  getEditHref: (id: string) => string;
}) {
  const ymd = dateToYmd(importantDate.date);

  return (
    <article
      className={cn(
        "border-border/70 bg-card min-w-0 rounded-xl border p-4 shadow-sm",
        deleting && "opacity-50",
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap">
          <time dateTime={ymd}>{formatImportantDate(importantDate, todayYmd)}</time>
        </span>
        {importantDate.recursYearly ? <YearlyBadge /> : null}
        {status === "past" ? <PastBadge label="Prošlo" /> : null}
        {status === "past-this-year" ? <PastBadge label="Prošlo ove godine" /> : null}
      </div>

      <Link
        to={getEditHref(importantDate.id)}
        className="font-display hover:text-primary mt-3 line-clamp-3 block min-w-0 text-left text-lg leading-tight font-semibold text-pretty transition-colors"
      >
        {importantDate.title}
      </Link>

      {importantDate.description ? (
        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
          {importantDate.description}
        </p>
      ) : null}

      <div className="border-border/60 mt-4 border-t pt-3">
        <ImportantDateActions importantDate={importantDate} getEditHref={getEditHref} mobile />
      </div>
    </article>
  );
}

function YearlyBadge() {
  return (
    <span className="bg-secondary/10 text-secondary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap">
      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      Svake godine
    </span>
  );
}

function PastBadge({ label }: { label: string }) {
  return (
    <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap">
      <CalendarOff className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

type ImportantDateStatus = "upcoming" | "past" | "past-this-year";

function getImportantDateStatus(
  importantDate: ImportantDateRow,
  todayYmd: string,
): ImportantDateStatus {
  const sourceYmd = dateToYmd(importantDate.date);
  if (!importantDate.recursYearly) return sourceYmd < todayYmd ? "past" : "upcoming";

  const sourceYear = Number(sourceYmd.slice(0, 4));
  const currentYear = Number(todayYmd.slice(0, 4));
  if (sourceYear > currentYear) return "upcoming";

  const occurrenceYmd = ymdWithYear(sourceYmd, currentYear);

  return occurrenceYmd && occurrenceYmd < todayYmd ? "past-this-year" : "upcoming";
}

function formatImportantDate(importantDate: ImportantDateRow, todayYmd: string) {
  const ymd = dateToYmd(importantDate.date);
  if (!importantDate.recursYearly) return formatYmdLong(ymd);

  const dayMonth = formatYmdDayMonth(ymd);
  const sourceYear = Number(ymd.slice(0, 4));
  const currentYear = Number(todayYmd.slice(0, 4));

  return sourceYear > currentYear ? `${dayMonth}, od ${sourceYear}.` : dayMonth;
}

type ActionProps = {
  importantDate: ImportantDateRow;
  getEditHref: (id: string) => string;
  mobile?: boolean;
};

function ImportantDateActions({ importantDate, getEditHref, mobile = false }: ActionProps) {
  const actionClassName = mobile ? "size-10 rounded-full" : undefined;

  return (
    <div
      className={
        mobile
          ? "grid w-full grid-cols-2 place-items-center gap-2"
          : "flex items-center justify-end gap-1"
      }
    >
      <IconActionButton asChild label="Uredi" tone="primary" className={actionClassName}>
        <Link to={getEditHref(importantDate.id)}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Link>
      </IconActionButton>
      <DeleteRecordButton
        id={importantDate.id}
        formIdPrefix={mobile ? "delete-important-date-card" : "delete-important-date"}
        intent={ImportantDateIntents.Delete}
        title="Obrisati važan datum?"
        description="Datum će biti trajno uklonjen i više se neće prikazivati na početnoj stranici. Ovu radnju nije moguće vratiti."
        confirmLabel="Obriši datum"
        iconLabel="Obriši"
        className={actionClassName}
      />
    </div>
  );
}
