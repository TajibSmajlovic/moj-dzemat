import { useActionData, useNavigation } from "react-router";

import { AdminPageHeader } from "#app/components/admin/admin-page-header";
import { AdminPanel } from "#app/components/admin/admin-panel";
import { requireAdmin } from "#app/features/auth/auth.server";
import { PostForm } from "#app/features/posts/admin/components/post-form";
import {
  createOrUpdatePostFromForm,
  parsePostFormData,
} from "#app/features/posts/admin/post-admin.server";
import { PostAdminIntents } from "#app/features/posts/admin/post-intents";
import { useIsSubmittingIntent } from "#app/lib/intent";
import { invariantResponse } from "#app/lib/invariant";
import { ROUTES } from "#app/lib/routes";
import { ROBOTS_NOINDEX_NOFOLLOW, buildNoindexMeta } from "#app/lib/seo";

import type { Route } from "./+types/admin.objave.nova";

export function meta(_args: Route.MetaArgs) {
  return buildNoindexMeta("Nova objava · Admin", ROBOTS_NOINDEX_NOFOLLOW);
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAdmin(request);

  const formData = await parsePostFormData(request);
  const intent = formData.get("intent");
  invariantResponse(intent === PostAdminIntents.Create, "Unsupported intent");

  return createOrUpdatePostFromForm({
    formData,
    authorId: user.id,
    intent: "create",
  });
}

export default function AdminNewPost() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = useIsSubmittingIntent(navigation, PostAdminIntents.Create);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <AdminPageHeader
        className="mb-6"
        backTo={ROUTES.adminPosts}
        backLabel="Nazad na listu"
        title="Nova objava"
        description={
          <>
            Popunite polja i po želji dodajte slike ili YouTube linkove. Ukoliko želite da objavite
            odmah, označite opciju "Objavi odmah". Nakon spremanja, moći ćete pregledati objavu i
            napraviti dodatne izmjene po potrebi.
          </>
        }
      />

      <AdminPanel>
        <PostForm
          lastResult={actionData && "result" in actionData ? actionData.result : null}
          submitting={submitting}
          cancelTo={ROUTES.adminPosts}
        />
      </AdminPanel>
    </main>
  );
}
