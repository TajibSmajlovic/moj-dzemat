import { Link, redirect, useActionData, useNavigation } from "react-router";

import { Plus } from "lucide-react";

import { AdminPageHeader } from "#app/components/admin/admin-page-header";
import { PostsAdminTable } from "#app/components/admin/posts-admin-table";
import { Button } from "#app/components/ui/button";
import { assertUnreachable, parseIntent, useSubmittingRowId } from "#app/lib/intent";
import { PostAdminIntents, type PostAdminIntent } from "#app/lib/intents";
import { getPaginationState, PAGE_SIZE, parsePageParam } from "#app/lib/pagination";
import { createActionToast } from "#app/lib/toast";
import { useActionToast } from "#app/lib/use-action-toast";
import { requireAdmin } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { logger } from "#app/utils/logger.server";
import { requireId, togglePostStatus } from "#app/utils/post-admin.server";

import type { Route } from "./+types/admin.objave._index";

const ADMIN_POSTS_PATH = "/admin/objave";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const url = new URL(request.url);
  const page = parsePageParam(url.searchParams.get("page"));
  const totalPosts = await prisma.post.count();
  const pagination = getPaginationState({ page, pageSize: PAGE_SIZE, totalItems: totalPosts });

  if (pagination.totalPages > 0 && page > pagination.totalPages) {
    return redirect(getPageHref(pagination.totalPages));
  }

  const posts = await prisma.post.findMany({
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: pagination.skip,
    take: pagination.pageSize,
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      status: true,
      publishedAt: true,
      featured: true,
      pinned: true,
      images: {
        orderBy: { position: "asc" },
        select: { id: true },
      },
    },
  });

  return { posts, pagination };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAdmin(request);
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

export default function AdminPostsList({ loaderData }: Route.ComponentProps) {
  const { posts, pagination } = loaderData;
  const actionData = useActionData<typeof action>();
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
            <Link to="/admin/objave/nova">
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
        getPageHref={getPageHref}
      />
    </main>
  );
}

function getPageHref(page: number) {
  return page <= 1 ? ADMIN_POSTS_PATH : `${ADMIN_POSTS_PATH}?page=${page}`;
}
