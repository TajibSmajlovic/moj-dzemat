import { useEffect, useRef } from "react";
import {
  Form,
  data,
  useActionData,
  useFetcher,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "react-router";

import { getFormProps, getInputProps, useForm, type SubmissionResult } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

import { Field } from "#app/components/forms/field";
import { Button } from "#app/components/ui/button";
import { Checkbox } from "#app/components/ui/checkbox";
import { ConfirmAction } from "#app/components/ui/confirm-action";
import { Label } from "#app/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "#app/components/ui/sheet";
import { showToast } from "#app/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#app/components/ui/table";
import { cn } from "#app/lib/cn";
import { formatDateShort } from "#app/lib/date";
import { requiredString } from "#app/lib/form-schema";
import { createActionToast } from "#app/lib/toast";
import { requireAdmin } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { logger } from "#app/utils/logger.server";
import { redirectWithToast } from "#app/utils/toast.server";

import type { Route } from "./+types/admin.obavijesna-traka";

const SiteAnnouncementSchema = z.object({
  message: requiredString("Poruka je obavezna.")
    .min(3, "Poruka mora imati najmanje 3 znaka.")
    .max(500, "Poruka može imati najviše 500 znakova."),
  // Checkbox inputs submit `"on"` when checked and are absent otherwise,
  // so we treat any non-"on" value (including missing) as false.
  isActive: z
    .literal("on")
    .optional()
    .transform((value) => value === "on"),
});

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const announcements = await prisma.siteAnnouncement.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      message: true,
      isActive: true,
      createdAt: true,
    },
  });
  return { announcements };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAdmin(request);
  const formData = await request.formData();

  const intent = formData.get("intent");

  if (intent === "delete") {
    const id = requireId(formData.get("id"));
    await prisma.siteAnnouncement.delete({ where: { id } });
    logger.info({ announcementId: id, userId: user.id }, "site announcement deleted");

    return {
      ok: true,
      toast: createActionToast({
        action: "delete",
        description: "Poruka na traci je obrisana.",
      }),
    };
  }

  if (intent === "toggle") {
    const id = requireId(formData.get("id"));
    const existing = await prisma.siteAnnouncement.findUniqueOrThrow({
      where: { id },
      select: { isActive: true },
    });

    const nextActive = !existing.isActive;

    await prisma.$transaction(async (tx) => {
      if (nextActive) {
        // Single-active invariant: flipping one on deactivates the rest.
        await tx.siteAnnouncement.updateMany({
          where: { id: { not: id }, isActive: true },
          data: { isActive: false },
        });
      }
      await tx.siteAnnouncement.update({
        where: { id },
        data: { isActive: nextActive },
      });
    });
    logger.info(
      { announcementId: id, userId: user.id, isActive: nextActive },
      "site announcement visibility toggled",
    );

    return {
      ok: true,
      toast: createActionToast({
        action: "activate",
        description: nextActive ? "Poruka na traci je prikazana." : "Poruka na traci je skrivena.",
      }),
    };
  }

  if (intent === "create" || intent === "update") {
    const submission = parseWithZod(formData, { schema: SiteAnnouncementSchema });
    if (submission.status !== "success") {
      return data({ result: submission.reply() }, { status: 400 });
    }

    const { message, isActive } = submission.value;
    let announcementId: string;

    await prisma.$transaction(async (tx) => {
      if (intent === "update") {
        const id = requireId(formData.get("id"));
        announcementId = id;
        if (isActive) {
          await tx.siteAnnouncement.updateMany({
            where: { id: { not: id }, isActive: true },
            data: { isActive: false },
          });
        }
        await tx.siteAnnouncement.update({
          where: { id },
          data: { message, isActive },
        });
      } else {
        if (isActive) {
          await tx.siteAnnouncement.updateMany({
            where: { isActive: true },
            data: { isActive: false },
          });
        }
        const created = await tx.siteAnnouncement.create({
          data: { message, isActive },
        });
        announcementId = created.id;
      }
    });
    logger.info(
      {
        announcementId: announcementId!,
        userId: user.id,
        intent,
        isActive,
        messageLength: message.length,
      },
      "site announcement saved",
    );

    return redirectWithToast("/admin/obavijesna-traka", {
      ...(intent === "create"
        ? createActionToast({
            action: "create",
            description: "Poruka na obavijesnoj traci je uspješno kreirana.",
          })
        : createActionToast({
            action: "update",
            description: "Poruka na obavijesnoj traci je uspješno ažurirana.",
          })),
    });
  }

  throw new Response("Unsupported intent", { status: 400 });
}

function requireId(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value) {
    throw new Response("Missing id", { status: 400 });
  }
  return value;
}

type AnnouncementRow = Awaited<ReturnType<typeof loader>>["announcements"][number];

export default function AdminAnnouncementBar({ loaderData }: Route.ComponentProps) {
  const { announcements } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const lastActionData = useRef(actionData);

  useEffect(() => {
    if (actionData && actionData !== lastActionData.current) {
      if (
        "ok" in actionData &&
        actionData.ok &&
        "toast" in actionData &&
        typeof actionData.toast === "object"
      ) {
        showToast(actionData.toast);
      }
      lastActionData.current = actionData;
    }
  }, [actionData]);

  const deletingId =
    navigation.formData?.get("intent") === "delete"
      ? (navigation.formData.get("id") as string | null)
      : null;

  const editId = searchParams.get("edit");
  const creating = searchParams.get("new") === "1";
  const editingAnnouncement = editId
    ? (announcements.find((announcement) => announcement.id === editId) ?? null)
    : null;
  const sheetOpen = creating || Boolean(editingAnnouncement);

  const submittingForm =
    navigation.state === "submitting" &&
    (navigation.formData?.get("intent") === "create" ||
      navigation.formData?.get("intent") === "update");

  const closeSheet = () => {
    void navigate("/admin/obavijesna-traka");
  };
  const openNew = () => {
    void navigate("/admin/obavijesna-traka?new=1");
  };
  const openEdit = (id: string) => {
    void navigate(`/admin/obavijesna-traka?edit=${id}`);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-foreground text-2xl font-semibold">Obavijesna traka</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Traka na vrhu javne stranice. Samo jedna poruka može biti aktivna, a nova aktivacija
            automatski deaktivira prethodnu.
          </p>
        </div>
        <Button type="button" size="lg" className="gap-2 rounded-xl shadow-lg" onClick={openNew}>
          <Plus className="h-5 w-5" aria-hidden="true" />
          Nova poruka
        </Button>
      </div>

      {announcements.length === 0 ? (
        <div className="border-border bg-card rounded-2xl border p-12 text-center">
          <p className="text-muted-foreground">
            Još nema poruka na traci. Kliknite 'Nova poruka' za početak.
          </p>
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
          <div className="overflow-x-auto">
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
                        onClick={() => openEdit(announcement.id)}
                        className="hover:text-primary line-clamp-2 text-left font-medium transition-colors"
                      >
                        {announcement.message}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          announcement.isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {announcement.isActive ? (
                          <Eye className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <EyeOff className="h-3 w-3" aria-hidden="true" />
                        )}
                        {announcement.isActive ? "Aktivna" : "Neaktivna"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateShort(announcement.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ToggleActive announcement={announcement} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Uredi"
                          onClick={() => openEdit(announcement.id)}
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Uredi</span>
                        </Button>
                        <DeleteAnnouncementButton announcement={announcement} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
      >
        <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
          <SheetHeader className="border-border border-b">
            <SheetTitle className="font-display text-lg">
              {editingAnnouncement ? "Uredi poruku" : "Nova poruka"}
            </SheetTitle>
            <SheetDescription>
              {editingAnnouncement
                ? "Izmjene se trenutno primjenjuju na traku."
                : "Kratka poruka koja se prikazuje na vrhu javne stranice."}
            </SheetDescription>
          </SheetHeader>
          <AnnouncementForm
            announcement={editingAnnouncement}
            lastResult={actionData && "result" in actionData ? actionData.result : null}
            submitting={submittingForm}
            onCancel={closeSheet}
          />
        </SheetContent>
      </Sheet>
    </main>
  );
}

function DeleteAnnouncementButton({ announcement }: { announcement: AnnouncementRow }) {
  const formId = `delete-announcement-${announcement.id}`;

  return (
    <Form id={formId} method="post" className="inline">
      <input type="hidden" name="intent" value="delete" />
      <input type="hidden" name="id" value={announcement.id} />

      <ConfirmAction
        form={formId}
        title="Obrisati poruku na traci?"
        description="Poruka će biti trajno uklonjena iz administracije i više se neće moći ponovo aktivirati. Ovu radnju nije moguće vratiti."
        confirmLabel="Obriši poruku"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Obriši"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Obriši poruku</span>
        </Button>
      </ConfirmAction>
    </Form>
  );
}

type ToggleActiveProps = {
  announcement: AnnouncementRow;
};

function ToggleActive({ announcement }: ToggleActiveProps) {
  const fetcher = useFetcher<typeof action>();
  const optimistic =
    fetcher.formData?.get("intent") === "toggle" && fetcher.formData.get("id") === announcement.id
      ? !announcement.isActive
      : announcement.isActive;

  const lastData = useRef(fetcher.data);

  useEffect(() => {
    if (fetcher.data && fetcher.data !== lastData.current) {
      if (
        "ok" in fetcher.data &&
        fetcher.data.ok &&
        "toast" in fetcher.data &&
        typeof fetcher.data.toast === "object"
      ) {
        showToast(fetcher.data.toast);
      }
      lastData.current = fetcher.data;
    }
  }, [fetcher.data]);

  return (
    <fetcher.Form method="post" className="inline">
      <input type="hidden" name="intent" value="toggle" />
      <input type="hidden" name="id" value={announcement.id} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        title={optimistic ? "Deaktiviraj" : "Aktiviraj"}
        className={cn(
          optimistic
            ? "text-primary hover:bg-primary/10"
            : "text-muted-foreground hover:text-primary hover:bg-primary/10",
        )}
      >
        {optimistic ? (
          <Eye className="h-4 w-4" aria-hidden="true" />
        ) : (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="sr-only">{optimistic ? "Deaktiviraj" : "Aktiviraj"}</span>
      </Button>
    </fetcher.Form>
  );
}

type AnnouncementFormProps = {
  announcement: AnnouncementRow | null;
  lastResult: SubmissionResult<string[]> | null;
  submitting: boolean;
  onCancel: () => void;
};

function AnnouncementForm({
  announcement,
  lastResult,
  submitting,
  onCancel,
}: AnnouncementFormProps) {
  const [form, fields] = useForm({
    id: announcement ? `announcement-${announcement.id}` : "announcement-new",
    lastResult,
    defaultValue: announcement ? { message: announcement.message } : undefined,
    shouldValidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: SiteAnnouncementSchema });
    },
  });

  return (
    <Form method="post" {...getFormProps(form)} className="flex h-full flex-col">
      <input type="hidden" name="intent" value={announcement ? "update" : "create"} />
      {announcement ? <input type="hidden" name="id" value={announcement.id} /> : null}

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <Field
          label="Poruka"
          errors={fields.message.errors}
          inputProps={{
            ...getInputProps(fields.message, { type: "text" }),
            maxLength: 500,
            placeholder: "Kratka poruka za posjetitelje…",
          }}
        />

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="announcement-isActive"
              name="isActive"
              defaultChecked={announcement?.isActive ?? false}
            />
            <Label htmlFor="announcement-isActive" className="text-sm font-normal">
              Aktivna
            </Label>
          </div>
          <p className="text-muted-foreground text-xs">
            Samo jedna poruka može biti aktivna. Aktiviranje ove automatski deaktivira sve ostale.
          </p>
        </div>
      </div>

      <div className="border-border bg-muted/40 flex items-center justify-end gap-2 border-t px-5 py-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Odustani
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Spremanje…" : announcement ? "Spremi izmjene" : "Sačuvaj"}
        </Button>
      </div>
    </Form>
  );
}
