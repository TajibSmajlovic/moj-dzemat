import { data, useActionData, useNavigate, useNavigation, useSearchParams } from "react-router";

import { parseWithZod } from "@conform-to/zod/v4";
import { Plus } from "lucide-react";

import { AdminPageHeader } from "#app/components/admin/admin-page-header";
import { Button } from "#app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "#app/components/ui/sheet";
import {
  AnnouncementIntents,
  type AnnouncementIntent,
} from "#app/features/announcements/admin/announcement-intents";
import { AnnouncementForm } from "#app/features/announcements/admin/components/announcement-form";
import { AnnouncementList } from "#app/features/announcements/admin/components/announcement-list";
import { AnnouncementFormSchema } from "#app/features/announcements/announcement-schema";
import {
  deactivateOtherAnnouncements,
  invalidateActiveAnnouncement,
} from "#app/features/announcements/site-announcement.server";
import { requireAdmin } from "#app/features/auth/auth.server";
import { requireId } from "#app/lib/id";
import { assertUnreachable, parseIntent, useSubmittingRowId } from "#app/lib/intent";
import { ROUTES } from "#app/lib/routes";
import { createActionToast } from "#app/lib/toast";
import { useActionToast } from "#app/lib/toast";
import { prisma } from "#app/server/db.server";
import { logger } from "#app/server/logger.server";
import { redirectWithToast } from "#app/server/toast.server";

import type { Route } from "./+types/admin.obavijesna-traka";

export async function loader({ request, url }: Route.LoaderArgs) {
  await requireAdmin(request, url);
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

export async function action({ request, url }: Route.ActionArgs) {
  const user = await requireAdmin(request, url);
  const formData = await request.formData();
  const intent = parseIntent(formData, AnnouncementIntents);

  switch (intent) {
    case AnnouncementIntents.Delete: {
      return handleDelete(formData, user.id);
    }
    case AnnouncementIntents.Toggle: {
      return handleToggle(formData, user.id);
    }
    case AnnouncementIntents.Create:
    case AnnouncementIntents.Update: {
      return handleUpsert(intent, formData, user.id);
    }
    default: {
      assertUnreachable(intent);
    }
  }
}

async function handleDelete(formData: FormData, userId: string) {
  const id = requireId(formData.get("id"));
  await prisma.siteAnnouncement.delete({ where: { id } });

  invalidateActiveAnnouncement();

  logger.info({ announcementId: id, userId }, "site announcement deleted");

  return {
    ok: true,
    toast: createActionToast({
      action: "delete",
      description: "Poruka na traci je obrisana.",
    }),
  };
}

async function handleToggle(formData: FormData, userId: string) {
  const id = requireId(formData.get("id"));
  const existing = await prisma.siteAnnouncement.findUniqueOrThrow({
    where: { id },
    select: { isActive: true },
  });
  const nextActive = !existing.isActive;

  await prisma.$transaction(async (tx) => {
    if (nextActive) {
      // Single-active invariant: flipping one on deactivates the rest.
      await deactivateOtherAnnouncements(tx, id);
    }

    await tx.siteAnnouncement.update({
      where: { id },
      data: { isActive: nextActive },
    });
  });

  invalidateActiveAnnouncement();

  logger.info(
    { announcementId: id, userId, isActive: nextActive },
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

async function handleUpsert(
  intent: typeof AnnouncementIntents.Create | typeof AnnouncementIntents.Update,
  formData: FormData,
  userId: string,
) {
  const submission = parseWithZod(formData, { schema: AnnouncementFormSchema });
  if (submission.status !== "success") {
    return data({ result: submission.reply() }, { status: 400 });
  }

  const { message, isActive } = submission.value;

  const announcementId = await prisma.$transaction(async (tx) => {
    if (intent === AnnouncementIntents.Update) {
      const id = requireId(formData.get("id"));

      if (isActive) {
        await deactivateOtherAnnouncements(tx, id);
      }

      await tx.siteAnnouncement.update({
        where: { id },
        data: { message, isActive },
      });

      return id;
    }

    if (isActive) {
      await deactivateOtherAnnouncements(tx);
    }

    const created = await tx.siteAnnouncement.create({
      data: { message, isActive },
    });

    return created.id;
  });

  invalidateActiveAnnouncement();

  logger.info(
    {
      announcementId,
      userId,
      intent,
      isActive,
      messageLength: message.length,
    },
    "site announcement saved",
  );

  return redirectWithToast(
    ROUTES.adminAnnouncementBar,
    intent === AnnouncementIntents.Create
      ? createActionToast({
          action: "create",
          description: "Poruka na obavijesnoj traci je uspješno kreirana.",
        })
      : createActionToast({
          action: "update",
          description: "Poruka na obavijesnoj traci je uspješno ažurirana.",
        }),
  );
}

export default function AdminAnnouncementBar({ loaderData }: Route.ComponentProps) {
  const { announcements } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useActionToast(actionData);

  const deletingId = useSubmittingRowId<AnnouncementIntent>(navigation, AnnouncementIntents.Delete);

  const editId = searchParams.get("edit");
  const creating = searchParams.get("new") === "1";
  const editingAnnouncement = editId
    ? (announcements.find((announcement) => announcement.id === editId) ?? null)
    : null;
  const sheetOpen = creating || Boolean(editingAnnouncement);

  const submittingForm =
    navigation.state === "submitting" &&
    (navigation.formData?.get("intent") === AnnouncementIntents.Create ||
      navigation.formData?.get("intent") === AnnouncementIntents.Update);

  const closeSheet = () => void navigate(ROUTES.adminAnnouncementBar);
  const openNew = () => void navigate(`${ROUTES.adminAnnouncementBar}?new=1`);
  const openEdit = (id: string) => {
    const params = new URLSearchParams({ edit: id });

    void navigate(`${ROUTES.adminAnnouncementBar}?${params.toString()}`);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AdminPageHeader
        title="Obavijesna traka"
        description="Traka na vrhu javne stranice. Samo jedna poruka može biti aktivna, a nova aktivacija automatski deaktivira prethodnu."
        actions={
          <Button type="button" size="lg" className="gap-2 rounded-xl shadow-lg" onClick={openNew}>
            <Plus className="h-5 w-5" aria-hidden="true" />
            Nova poruka
          </Button>
        }
      />

      <AnnouncementList announcements={announcements} deletingId={deletingId} onEdit={openEdit} />

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
