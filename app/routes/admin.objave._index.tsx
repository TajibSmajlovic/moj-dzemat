import { href, Link, redirect, useNavigation } from "react-router";

import { Plus } from "lucide-react";

import { AdminPageHeader } from "#app/components/admin/admin-page-header";
import { Button } from "#app/components/ui/button";
import { adminUserContext } from "#app/features/auth/auth-context";
import { getAdminPostListPage } from "#app/features/posts/admin/admin-post-list.server";
import { PostsAdminTable } from "#app/features/posts/admin/components/posts-admin-table";
import { togglePostStatus } from "#app/features/posts/admin/post-admin.server";
import { PostAdminIntents, type PostAdminIntent } from "#app/features/posts/admin/post-intents";
import { adminPostsPageHref } from "#app/features/posts/post-routes";
import { requireId } from "#app/lib/id";
import { assertUnreachable, parseIntent, useSubmittingRowId } from "#app/lib/intent";
import { parsePageParam } from "#app/lib/pagination";
import { createActionToast } from "#app/lib/toast";
import { useActionToast } from "#app/lib/toast";
import { prisma } from "#app/server/db.server";
import { logger } from "#app/server/logger.server";

import type { Route } from "./+types/admin.objave._index";

export async function loader({ context, url }: Route.LoaderArgs) {
  context.get(adminUserContext);

  const page = parsePageParam(url.searchParams.get("page"));
  const { posts, pagination } = await getAdminPostListPage({ page });

  if (pagination.totalPages > 0 && page > pagination.totalPages) {
    return redirect(adminPostsPageHref(pagination.totalPages));
  }

  return { posts, pagination };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = context.get(adminUserContext);
  const formData = await request.formData();
  const intent = parseIntent(formData, PostAdminIntents);

  switch (intent) {
    case PostAdminIntents.Delete: {
      return handleDelete(formData, user.id);
    }
    case PostAdminIntents.ToggleFeatured: {
      return handleToggleFeatured(formData, user.id);
    }
    case PostAdminIntents.TogglePinned: {
      return handleTogglePinned(formData, user.id);
    }
    case PostAdminIntents.ToggleStatus: {
      return handleToggleStatus(formData, user.id);
    }
    case PostAdminIntents.Create:
    case PostAdminIntents.Update:
    case PostAdminIntents.DeleteImage: {
      // These intents belong to the create/edit routes, not the list.
      throw new Response("Unsupported intent", { status: 400 });
    }
    default: {
      assertUnreachable(intent);
    }
  }
}

async function handleDelete(formData: FormData, userId: string) {
  const id = requireId(formData.get("id"));

  const post = await prisma.post.findUnique({
    where: { id },
    select: { title: true, slug: true, type: true },
  });
  await prisma.post.delete({ where: { id } });

  logger.info({ postId: id, userId, slug: post?.slug, type: post?.type }, "post deleted");

  return {
    ok: true,
    toast: createActionToast({
      action: "delete",
      description: `Objava "${post?.title}" obrisana.`,
    }),
  };
}

async function handleToggleFeatured(formData: FormData, userId: string) {
  const id = requireId(formData.get("id"));

  const post = await prisma.post.findUniqueOrThrow({
    where: { id },
    select: { featured: true },
  });
  const next = !post.featured;

  await prisma.post.update({ where: { id }, data: { featured: next } });

  logger.info({ postId: id, userId, featured: next }, "post featured toggled");

  return {
    ok: true,
    toast: createActionToast({
      action: "feature",
      description: next ? "Objava istaknuta." : "Uklonjeno iz istaknutih.",
    }),
  };
}

async function handleTogglePinned(formData: FormData, userId: string) {
  const id = requireId(formData.get("id"));

  const post = await prisma.post.findUniqueOrThrow({
    where: { id },
    select: { pinned: true },
  });
  const next = !post.pinned;

  await prisma.post.update({ where: { id }, data: { pinned: next } });

  logger.info({ postId: id, userId, pinned: next }, "post pinned toggled");

  return {
    ok: true,
    toast: createActionToast({
      action: "pin",
      description: next ? "Objava je stavljena na vrh." : "Objava više nije na vrhu.",
    }),
  };
}

async function handleToggleStatus(formData: FormData, userId: string) {
  const id = requireId(formData.get("id"));
  const next = await togglePostStatus(id, userId);

  return {
    ok: true,
    toast: createActionToast({
      action: "update",
      description: next === "published" ? "Objava je objavljena." : "Objava je sakrivena.",
    }),
  };
}

export default function AdminPostsList({ actionData, loaderData }: Route.ComponentProps) {
  const { posts, pagination } = loaderData;
  const navigation = useNavigation();

  useActionToast(actionData);

  const deletingId = useSubmittingRowId<PostAdminIntent>(navigation, PostAdminIntents.Delete);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AdminPageHeader
        title="Objave"
        description="Objave na vrhu se prikazuju prve. Istaknuto se prikazuje u hero sekciji."
        actions={
          <Button type="button" size="lg" className="gap-2 rounded-xl shadow-lg" asChild>
            <Link to={href("/admin/objave/nova")}>
              <Plus className="h-5 w-5" aria-hidden="true" />
              Nova objava
            </Link>
          </Button>
        }
      />

      <PostsAdminTable
        posts={posts}
        pagination={pagination}
        deletingId={deletingId}
        getPageHref={adminPostsPageHref}
      />
    </main>
  );
}
