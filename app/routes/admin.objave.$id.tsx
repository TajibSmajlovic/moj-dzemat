import { Link, useActionData, useNavigation } from "react-router";

import { ArrowLeft } from "lucide-react";

import { PostForm } from "#app/components/admin/post-form";
import { createActionToast } from "#app/lib/toast";
import { requireAdmin } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { logger } from "#app/utils/logger.server";
import { createOrUpdatePostFromForm, requireId } from "#app/utils/post-admin.server";

import type { Route } from "./+types/admin.objave.$id";

const POST_FORM_SELECT = {
  id: true,
  title: true,
  slug: true,
  type: true,
  body: true,
  featured: true,
  pinned: true,
  images: {
    orderBy: { position: "asc" as const },
    select: { id: true },
  },
} as const;

export function meta({ data }: Route.MetaArgs) {
  if (!data?.post) {
    return [{ title: "Objava · Admin" }];
  }
  return [{ title: `Uredi „${data.post.title}" · Admin` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const id = requireId(params.id);
  const post = await prisma.post.findUnique({
    where: { id },
    select: POST_FORM_SELECT,
  });

  if (!post) {
    throw new Response("Objava nije pronađena.", { status: 404 });
  }

  return { post };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAdmin(request);
  const routePostId = requireId(params.id);

  const formData = await request.clone().formData();

  const intent = formData.get("intent");

  if (intent === "delete-image") {
    const postId = requireId(formData.get("id"));
    if (postId !== routePostId) {
      throw new Response("Neispravan zahtjev.", { status: 400 });
    }
    const imageId = requireId(formData.get("imageId"));
    const result = await prisma.postImage.deleteMany({
      where: { id: imageId, postId },
    });
    if (result.count > 0) {
      logger.info({ imageId, postId, userId: user.id }, "post image deleted");
    }
    return {
      ok: true,
      toast: createActionToast({ action: "delete", description: "Slika obrisana." }),
    };
  }

  if (intent === "update") {
    const bodyPostId = requireId(formData.get("id"));
    if (bodyPostId !== routePostId) {
      throw new Response("Neispravan zahtjev.", { status: 400 });
    }
    return createOrUpdatePostFromForm({
      request,
      authorId: user.id,
      intent: "update",
    });
  }

  throw new Response("Unsupported intent", { status: 400 });
}

export default function AdminEditPost({ loaderData }: Route.ComponentProps) {
  const { post } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting =
    navigation.state === "submitting" && navigation.formData?.get("intent") === "update";

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
        <h1 className="font-display text-foreground text-2xl font-semibold">Uredi objavu</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Uređujete „{post.title}". Sačuvajte izmjene ili se vratite bez spremanja.
        </p>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
        <PostForm
          post={post}
          lastResult={actionData && "result" in actionData ? actionData.result : null}
          submitting={submitting}
          cancelTo="/admin/objave"
        />
      </div>
    </main>
  );
}
