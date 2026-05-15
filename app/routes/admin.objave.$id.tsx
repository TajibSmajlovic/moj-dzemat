import { useActionData, useNavigation } from "react-router";

import { AdminPageHeader } from "#app/components/admin/admin-page-header";
import { AdminPanel } from "#app/components/admin/admin-panel";
import { SegmentErrorBoundary } from "#app/components/layout/segment-error-boundary";
import { requireAdmin } from "#app/features/auth/auth.server";
import { PostForm } from "#app/features/posts/admin/components/post-form";
import { createOrUpdatePostFromForm, requireId } from "#app/features/posts/admin/post-admin.server";
import { PostAdminIntents } from "#app/features/posts/admin/post-intents";
import { assertUnreachable, parseIntent, useIsSubmittingIntent } from "#app/lib/intent";
import { invariantResponse } from "#app/lib/invariant";
import { ROBOTS_NOINDEX_NOFOLLOW } from "#app/lib/seo";
import { createActionToast } from "#app/lib/toast";
import { prisma } from "#app/server/db.server";
import { logger } from "#app/server/logger.server";

import type { Route } from "./+types/admin.objave.$id";

const POST_FORM_SELECT = {
  id: true,
  title: true,
  slug: true,
  type: true,
  body: true,
  status: true,
  featured: true,
  pinned: true,
  images: {
    orderBy: { position: "asc" as const },
    select: { id: true, altText: true },
  },
} as const;

const SUPPORTED_INTENTS = {
  Update: PostAdminIntents.Update,
  DeleteImage: PostAdminIntents.DeleteImage,
} as const;

export function meta({ data }: Route.MetaArgs) {
  if (!data?.post) {
    return [{ title: "Objava · Admin" }, { name: "robots", content: ROBOTS_NOINDEX_NOFOLLOW }];
  }
  return [
    { title: `Uredi „${data.post.title}" · Admin` },
    { name: "robots", content: ROBOTS_NOINDEX_NOFOLLOW },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const id = requireId(params.id);
  const post = await prisma.post.findUnique({
    where: { id },
    select: POST_FORM_SELECT,
  });

  invariantResponse(post, "Objava nije pronađena.", { status: 404 });

  return { post };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAdmin(request);
  const routePostId = requireId(params.id);

  const formData = await request.clone().formData();
  const intent = parseIntent(formData, SUPPORTED_INTENTS);

  switch (intent) {
    case SUPPORTED_INTENTS.DeleteImage: {
      const postId = requireId(formData.get("id"));
      invariantResponse(postId === routePostId, "Neispravan zahtjev.");
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
    case SUPPORTED_INTENTS.Update: {
      const bodyPostId = requireId(formData.get("id"));
      invariantResponse(bodyPostId === routePostId, "Neispravan zahtjev.");
      return createOrUpdatePostFromForm({
        request,
        authorId: user.id,
        intent: "update",
      });
    }
    default: {
      assertUnreachable(intent);
    }
  }
}

export default function AdminEditPost({ loaderData }: Route.ComponentProps) {
  const { post } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = useIsSubmittingIntent(navigation, PostAdminIntents.Update);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <AdminPageHeader
        className="mb-6"
        backTo="/admin/objave"
        backLabel="Nazad na listu"
        title="Uredi objavu"
        description={`Uređujete "${post.title}". Sačuvajte izmjene, pregledajte ili objavite kada je spremno.`}
      />

      <AdminPanel>
        <PostForm
          post={post}
          lastResult={actionData && "result" in actionData ? actionData.result : null}
          submitting={submitting}
          cancelTo="/admin/objave"
        />
      </AdminPanel>
    </main>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <SegmentErrorBoundary
      error={error}
      tone="admin"
      backTo="/admin/objave"
      backLabel="Nazad na listu objava"
    />
  );
}
