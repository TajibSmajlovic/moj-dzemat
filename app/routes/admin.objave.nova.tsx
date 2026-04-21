import { Link, useActionData, useNavigation } from "react-router";

import { ArrowLeft } from "lucide-react";

import { PostForm } from "#app/components/admin/post-form";
import { requireAdmin } from "#app/utils/auth.server";
import { createOrUpdatePostFromForm } from "#app/utils/post-admin.server";

import type { Route } from "./+types/admin.objave.nova";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Nova objava · Admin" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAdmin(request);

  const formData = await request.clone().formData();
  const intent = formData.get("intent");
  if (intent !== "create") {
    throw new Response("Unsupported intent", { status: 400 });
  }

  return createOrUpdatePostFromForm({
    request,
    authorId: user.id,
    intent: "create",
  });
}

export default function AdminNewPost() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting =
    navigation.state === "submitting" && navigation.formData?.get("intent") === "create";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          to="/admin/objave"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Nazad na listu
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="font-display text-foreground text-2xl font-semibold">Nova objava</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Popunite polja i po želji dodajte slike (do 3). Sačuvajte kada ste gotovi.
        </p>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
        <PostForm
          lastResult={actionData && "result" in actionData ? actionData.result : null}
          submitting={submitting}
          cancelTo="/admin/objave"
        />
      </div>
    </main>
  );
}
