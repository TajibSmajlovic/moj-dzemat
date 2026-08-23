import { data, href, Link, useNavigate, useNavigation, useSearchParams } from "react-router";

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
import { useActionToast } from "#app/components/ui/sonner";
import { adminUserContext } from "#app/features/auth/auth-context";
import { ImportantDateForm } from "#app/features/important-dates/admin/components/important-date-form";
import { ImportantDateList } from "#app/features/important-dates/admin/components/important-date-list";
import {
  ImportantDateIntents,
  type ImportantDateIntent,
} from "#app/features/important-dates/admin/important-date-intents";
import { ImportantDateFormSchema } from "#app/features/important-dates/important-date-schema";
import { getAdminImportantDates } from "#app/features/important-dates/important-dates.server";
import { dateToYmd, ymdToUtcDate } from "#app/lib/date";
import { requireId } from "#app/lib/id";
import { assertUnreachable, parseIntent, useSubmittingRowId } from "#app/lib/intent";
import { invariant } from "#app/lib/invariant";
import { createActionToast } from "#app/lib/toast";
import { prisma } from "#app/server/db.server";
import { logger } from "#app/server/logger.server";
import { redirectWithToast } from "#app/server/toast.server";

import type { Route } from "./+types/admin.vazni-datumi";

export async function loader({ context }: Route.LoaderArgs) {
  context.get(adminUserContext);
  const importantDates = await getAdminImportantDates();

  return { importantDates };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = context.get(adminUserContext);
  const formData = await request.formData();
  const intent = parseIntent(formData, ImportantDateIntents);

  switch (intent) {
    case ImportantDateIntents.Delete: {
      return handleDelete(formData, user.id);
    }
    case ImportantDateIntents.Create:
    case ImportantDateIntents.Update: {
      return handleUpsert(intent, formData, user.id);
    }
    default: {
      assertUnreachable(intent);
    }
  }
}

async function handleDelete(formData: FormData, userId: string) {
  const id = requireId(formData.get("id"));
  await prisma.importantDate.delete({ where: { id } });

  logger.info({ importantDateId: id, userId }, "important date deleted");

  return {
    ok: true,
    toast: createActionToast({
      action: "delete",
      description: "Važan datum je obrisan.",
    }),
  };
}

async function handleUpsert(
  intent: typeof ImportantDateIntents.Create | typeof ImportantDateIntents.Update,
  formData: FormData,
  userId: string,
) {
  const submission = parseWithZod(formData, { schema: ImportantDateFormSchema });
  if (submission.status !== "success") {
    return data({ result: submission.reply() }, { status: 400 });
  }

  const { title, date, description, recursYearly } = submission.value;
  const dateValue = ymdToUtcDate(date);
  invariant(dateValue, "Schema guarantees a valid YMD date");

  let importantDateId: string;
  if (intent === ImportantDateIntents.Update) {
    const id = requireId(formData.get("id"));
    await prisma.importantDate.update({
      where: { id },
      data: { title, date: dateValue, description, recursYearly },
    });
    importantDateId = id;
  } else {
    const created = await prisma.importantDate.create({
      data: { title, date: dateValue, description, recursYearly },
    });
    importantDateId = created.id;
  }

  logger.info(
    { importantDateId, userId, intent, date: dateToYmd(dateValue), recursYearly },
    "important date saved",
  );

  return redirectWithToast(
    href("/admin/vazni-datumi"),
    intent === ImportantDateIntents.Create
      ? createActionToast({
          action: "create",
          description: "Važan datum je uspješno dodan.",
        })
      : createActionToast({
          action: "update",
          description: "Važan datum je uspješno ažuriran.",
        }),
  );
}

export default function AdminImportantDates({ actionData, loaderData }: Route.ComponentProps) {
  const { importantDates } = loaderData;
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useActionToast(actionData);

  const deletingId = useSubmittingRowId<ImportantDateIntent>(
    navigation,
    ImportantDateIntents.Delete,
  );

  const editId = searchParams.get("edit");
  const creating = searchParams.get("new") === "1";
  const editingImportantDate = editId
    ? (importantDates.find((importantDate) => importantDate.id === editId) ?? null)
    : null;
  const sheetOpen = creating || Boolean(editingImportantDate);

  const submittingForm =
    navigation.state === "submitting" &&
    (navigation.formData?.get("intent") === ImportantDateIntents.Create ||
      navigation.formData?.get("intent") === ImportantDateIntents.Update);

  const closeSheet = () => void navigate(href("/admin/vazni-datumi"));

  const newHref = `${href("/admin/vazni-datumi")}?new=1`;
  const getEditHref = (id: string) =>
    `${href("/admin/vazni-datumi")}?${new URLSearchParams({ edit: id }).toString()}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AdminPageHeader
        title="Važni datumi"
        description="Upravljajte predstojećim važnim datumima koji se prikazuju na početnoj stranici."
        actions={
          <Button asChild size="lg" className="gap-2 rounded-xl shadow-lg">
            <Link to={newHref}>
              <Plus className="h-5 w-5" aria-hidden="true" />
              Novi datum
            </Link>
          </Button>
        }
      />

      <ImportantDateList
        importantDates={importantDates}
        deletingId={deletingId}
        getEditHref={getEditHref}
      />

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
      >
        <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
          <SheetHeader className="border-border border-b">
            <SheetTitle className="font-display text-lg">
              {editingImportantDate ? "Uredi datum" : "Novi datum"}
            </SheetTitle>
            <SheetDescription>
              {editingImportantDate
                ? "Izmjene se odmah primjenjuju na početnu stranicu."
                : "Datum koji se prikazuje u sekciji 'Važni datumi' na početnoj stranici."}
            </SheetDescription>
          </SheetHeader>
          <ImportantDateForm
            importantDate={editingImportantDate}
            lastResult={actionData && "result" in actionData ? actionData.result : null}
            submitting={submittingForm}
            onCancel={closeSheet}
          />
        </SheetContent>
      </Sheet>
    </main>
  );
}
