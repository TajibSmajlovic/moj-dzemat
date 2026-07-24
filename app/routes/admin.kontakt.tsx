import { data, href, useNavigation } from "react-router";

import { parseWithZod } from "@conform-to/zod/v4";

import { AdminPageHeader } from "#app/components/admin/admin-page-header";
import { adminUserContext } from "#app/features/auth/auth-context";
import { ContactForm } from "#app/features/contact/admin/components/contact-form";
import { ContactIntents } from "#app/features/contact/admin/contact-intents";
import { CommunityInfoFormSchema } from "#app/features/contact/contact-schema";
import { getCommunityInfo, saveCommunityInfo } from "#app/features/contact/contact.server";
import { assertUnreachable, parseIntent } from "#app/lib/intent";
import { createActionToast } from "#app/lib/toast";
import { logger } from "#app/server/logger.server";
import { redirectWithToast } from "#app/server/toast.server";

import type { Route } from "./+types/admin.kontakt";

export async function loader({ context }: Route.LoaderArgs) {
  context.get(adminUserContext);
  const info = await getCommunityInfo();
  return { info };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = context.get(adminUserContext);
  const formData = await request.formData();
  const intent = parseIntent(formData, ContactIntents);

  switch (intent) {
    case ContactIntents.Save: {
      const submission = parseWithZod(formData, { schema: CommunityInfoFormSchema });
      if (submission.status !== "success") {
        return data({ result: submission.reply() }, { status: 400 });
      }

      await saveCommunityInfo(submission.value);

      logger.info(
        {
          userId: user.id,
          hasPhone: Boolean(submission.value.contactPhone),
          hasEmail: Boolean(submission.value.contactEmail),
          hasBankAccount: Boolean(submission.value.bankAccount),
        },
        "community contact info saved",
      );

      return redirectWithToast(
        href("/admin/kontakt"),
        createActionToast({
          action: "update",
          description: "Kontakt informacije su uspješno sačuvane.",
        }),
      );
    }
    default: {
      assertUnreachable(intent);
    }
  }
}

export default function AdminKontaktPage({ actionData, loaderData }: Route.ComponentProps) {
  const { info } = loaderData;
  const navigation = useNavigation();

  const submitting =
    navigation.state === "submitting" && navigation.formData?.get("intent") === ContactIntents.Save;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AdminPageHeader
        title="Kontakt"
        description="Uredite javne podatke o džematu, kontakt, imama i podatke za uplatu. Adresa i mapa se i dalje podešavaju preko okruženja."
      />

      <ContactForm
        info={info}
        lastResult={actionData && "result" in actionData ? actionData.result : null}
        submitting={submitting}
      />
    </main>
  );
}
