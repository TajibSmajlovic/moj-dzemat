import { Eye, EyeOff, Pencil } from "lucide-react";

import { AdminPanel } from "#app/components/admin/admin-panel";
import { DeleteRecordButton } from "#app/components/admin/delete-record-button";
import { EmptyState } from "#app/components/admin/empty-state";
import { IconActionButton } from "#app/components/admin/icon-action-button";
import { OptimisticToggleIconButton } from "#app/components/admin/optimistic-toggle-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#app/components/ui/table";
import { AnnouncementIntents } from "#app/features/announcements/admin/announcement-intents";
import { cn } from "#app/lib/cn";
import { formatDateShort } from "#app/lib/date";

export type AnnouncementRow = {
  id: string;
  message: string;
  isActive: boolean;
  createdAt: Date;
};

type Props = {
  announcements: AnnouncementRow[];
  deletingId: string | null;
  onEdit: (id: string) => void;
};

export function AnnouncementList({ announcements, deletingId, onEdit }: Props) {
  if (announcements.length === 0) {
    return (
      <EmptyState>
        <p className="text-muted-foreground">
          Još nema poruka na traci. Kliknite 'Nova poruka' za početak.
        </p>
      </EmptyState>
    );
  }

  return (
    <AdminPanel className="md:bg-card overflow-visible rounded-none border-0 bg-transparent shadow-none md:overflow-hidden md:rounded-2xl md:border md:shadow-sm">
      <div className="grid gap-3 md:hidden">
        {announcements.map((announcement) => (
          <AnnouncementMobileCard
            key={announcement.id}
            announcement={announcement}
            deleting={deletingId === announcement.id}
            onEdit={onEdit}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Poruka</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-32">Dodano</TableHead>
              <TableHead className="w-48 text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((announcement) => (
              <TableRow
                key={announcement.id}
                className={deletingId === announcement.id ? "opacity-50" : undefined}
              >
                <TableCell>
                  <button
                    type="button"
                    onClick={() => onEdit(announcement.id)}
                    className="hover:text-primary line-clamp-2 text-left font-medium transition-colors"
                  >
                    {announcement.message}
                  </button>
                </TableCell>
                <TableCell>
                  <AnnouncementStatusBadge active={announcement.isActive} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDateShort(announcement.createdAt)}
                </TableCell>
                <TableCell>
                  <AnnouncementActions announcement={announcement} onEdit={onEdit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminPanel>
  );
}

function AnnouncementMobileCard({
  announcement,
  deleting,
  onEdit,
}: {
  announcement: AnnouncementRow;
  deleting: boolean;
  onEdit: (id: string) => void;
}) {
  return (
    <article
      className={cn(
        "border-border/70 bg-card min-w-0 rounded-xl border p-4 shadow-sm",
        announcement.isActive && "ring-primary/10 ring-1",
        deleting && "opacity-50",
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <AnnouncementStatusBadge active={announcement.isActive} />
        <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap">
          Dodano {formatDateShort(announcement.createdAt)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onEdit(announcement.id)}
        className="font-display hover:text-primary mt-3 line-clamp-3 min-w-0 text-left text-lg leading-tight font-semibold text-pretty transition-colors"
      >
        {announcement.message}
      </button>

      <div className="border-border/60 mt-4 border-t pt-3">
        <AnnouncementActions announcement={announcement} onEdit={onEdit} mobile />
      </div>
    </article>
  );
}

function AnnouncementStatusBadge({ active, className }: { active: boolean; className?: string }) {
  const Icon = active ? Eye : EyeOff;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {active ? "Aktivna" : "Neaktivna"}
    </span>
  );
}

type ActionProps = {
  announcement: AnnouncementRow;
  onEdit: (id: string) => void;
  mobile?: boolean;
};

function AnnouncementActions({ announcement, onEdit, mobile = false }: ActionProps) {
  const actionClassName = mobile ? "size-10 rounded-full" : undefined;

  return (
    <div
      className={
        mobile
          ? "grid w-full grid-cols-3 place-items-center gap-2"
          : "flex items-center justify-end gap-1"
      }
    >
      <OptimisticToggleIconButton
        intent={AnnouncementIntents.Toggle}
        id={announcement.id}
        active={announcement.isActive}
        tone="primary"
        activeLabel="Deaktiviraj"
        inactiveLabel="Aktiviraj"
        activeIcon={<Eye className="h-4 w-4" aria-hidden="true" />}
        inactiveIcon={<EyeOff className="h-4 w-4" aria-hidden="true" />}
        className={actionClassName}
      />
      <IconActionButton
        label="Uredi"
        tone="primary"
        className={actionClassName}
        onClick={() => onEdit(announcement.id)}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </IconActionButton>
      <DeleteRecordButton
        id={announcement.id}
        formIdPrefix={mobile ? "delete-announcement-card" : "delete-announcement"}
        intent={AnnouncementIntents.Delete}
        title="Obrisati poruku na traci?"
        description="Poruka će biti trajno uklonjena iz administracije i više se neće moći ponovo aktivirati. Ovu radnju nije moguće vratiti."
        confirmLabel="Obriši poruku"
        iconLabel="Obriši"
        className={actionClassName}
      />
    </div>
  );
}
