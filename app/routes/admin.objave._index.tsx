import { Link, redirect, useActionData, useNavigation } from "react-router";

import { Eye, EyeOff, Pencil, Pin, Plus, Star } from "lucide-react";

import { AdminPageHeader } from "#app/components/admin/admin-page-header";
import { AdminPanel } from "#app/components/admin/admin-panel";
import { DeleteRecordButton } from "#app/components/admin/delete-record-button";
import { EmptyState } from "#app/components/admin/empty-state";
import { IconActionButton } from "#app/components/admin/icon-action-button";
import { OptimisticToggleIconButton } from "#app/components/admin/optimistic-toggle-button";
import { PaginationControls } from "#app/components/admin/pagination-controls";
import { PostStatusBadge } from "#app/components/admin/post-status-badge";
import { PostTypeBadge } from "#app/components/posts/post-type-badge";
import { Button } from "#app/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#app/components/ui/table";
import { formatDateShort } from "#app/lib/date";
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

  const intent = formData.get("intent");

  if (intent === "delete") {
    const id = requireId(formData.get("id"));

    const post = await prisma.post.findUnique({
      where: { id },
      select: { title: true, slug: true, type: true },
    });
    await prisma.post.delete({ where: { id } });

    logger.info(
      { postId: id, userId: user.id, slug: post?.slug, type: post?.type },
      "post deleted",
    );

    return {
      ok: true,
      toast: createActionToast({
        action: "delete",
        description: `Objava "${post?.title}" obrisana.`,
      }),
    };
  }

  if (intent === "toggle-featured") {
    const id = requireId(formData.get("id"));

    const post = await prisma.post.findUniqueOrThrow({
      where: { id },
      select: { featured: true },
    });

    const next = !post.featured;

    await prisma.post.update({ where: { id }, data: { featured: next } });

    logger.info({ postId: id, userId: user.id, featured: next }, "post featured toggled");

    return {
      ok: true,
      toast: createActionToast({
        action: "feature",
        description: next ? "Objava istaknuta." : "Uklonjeno iz istaknutih.",
      }),
    };
  }

  if (intent === "toggle-pinned") {
    const id = requireId(formData.get("id"));

    const post = await prisma.post.findUniqueOrThrow({
      where: { id },
      select: { pinned: true },
    });
    const next = !post.pinned;

    await prisma.post.update({ where: { id }, data: { pinned: next } });

    logger.info({ postId: id, userId: user.id, pinned: next }, "post pinned toggled");

    return {
      ok: true,
      toast: createActionToast({
        action: "pin",
        description: next ? "Objava je stavljena na vrh." : "Objava više nije na vrhu.",
      }),
    };
  }

  if (intent === "toggle-status") {
    const id = requireId(formData.get("id"));
    const next = await togglePostStatus(id, user.id);

    return {
      ok: true,
      toast: createActionToast({
        action: "update",
        description: next === "published" ? "Objava je objavljena." : "Objava je sakrivena.",
      }),
    };
  }

  throw new Response("Unsupported intent", { status: 400 });
}

export default function AdminPostsList({ loaderData }: Route.ComponentProps) {
  const { posts, pagination } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  useActionToast(actionData);

  const deletingId =
    navigation.formData?.get("intent") === "delete"
      ? (navigation.formData.get("id") as string | null)
      : null;

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

      <PostsTable posts={posts} pagination={pagination} deletingId={deletingId} />
    </main>
  );
}

function PostsTable({
  posts,
  pagination,
  deletingId,
}: {
  posts: Route.ComponentProps["loaderData"]["posts"];
  pagination: Route.ComponentProps["loaderData"]["pagination"];
  deletingId: string | null;
}) {
  if (posts.length === 0) {
    return (
      <EmptyState>
        <p className="text-muted-foreground">
          Još nema objava.{" "}
          <Link to="/admin/objave/nova" className="text-primary font-medium hover:underline">
            Dodajte prvu objavu
          </Link>
          .
        </p>
      </EmptyState>
    );
  }

  return (
    <AdminPanel>
      <div className="overflow-x-auto">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Objava</TableHead>
              <TableHead className="w-36">Vrsta</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-32">Datum</TableHead>
              <TableHead className="w-16 text-center">Slike</TableHead>
              <TableHead className="w-60 text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id} className={deletingId === post.id ? "opacity-50" : undefined}>
                <TableCell className="max-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    {post.featured ? (
                      <Star
                        className="fill-secondary text-secondary h-4 w-4 shrink-0"
                        aria-label="Istaknuto"
                      />
                    ) : null}
                    {post.pinned ? (
                      <Pin
                        className="fill-primary text-primary h-4 w-4 shrink-0"
                        aria-label="Na vrhu"
                      />
                    ) : null}
                    <Link
                      to={`/admin/objave/${post.id}`}
                      className="hover:text-primary min-w-0 truncate font-medium transition-colors"
                    >
                      {post.title}
                    </Link>
                  </div>

                  <div className="text-muted-foreground mt-0.5 truncate text-xs">/{post.slug}</div>
                </TableCell>

                <TableCell>
                  <PostTypeBadge type={post.type} />
                </TableCell>

                <TableCell>
                  <PostStatusBadge status={post.status} />
                </TableCell>

                <TableCell className="text-muted-foreground text-sm">
                  {formatDateShort(post.publishedAt)}
                </TableCell>

                <TableCell className="text-center text-sm">{post.images.length}</TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <OptimisticToggleIconButton
                      intent="toggle-featured"
                      id={post.id}
                      active={post.featured}
                      tone="secondary"
                      activeLabel="Ukloni istaknuto"
                      inactiveLabel="Istakni"
                      activeIcon={<Star className="h-4 w-4" aria-hidden="true" />}
                    />

                    <OptimisticToggleIconButton
                      intent="toggle-pinned"
                      id={post.id}
                      active={post.pinned}
                      tone="primary"
                      activeLabel="Ukloni sa vrha"
                      inactiveLabel="Stavi na vrh"
                      activeIcon={<Pin className="h-4 w-4" aria-hidden="true" />}
                    />

                    <OptimisticToggleIconButton
                      intent="toggle-status"
                      id={post.id}
                      active={post.status === "published"}
                      tone="primary"
                      activeLabel="Sakrij objavu"
                      inactiveLabel="Objavi"
                      activeIcon={<Eye className="h-4 w-4" aria-hidden="true" />}
                      inactiveIcon={<EyeOff className="h-4 w-4" aria-hidden="true" />}
                    />

                    <IconActionButton label="Uredi" tone="primary" asChild>
                      <Link to={`/admin/objave/${post.id}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </IconActionButton>

                    <DeleteRecordButton
                      id={post.id}
                      formIdPrefix="delete-post"
                      title="Obrisati objavu?"
                      description={
                        <>
                          Objava <strong className="text-foreground">"{post.title}"</strong> biće
                          trajno uklonjena iz javne stranice i administracije. Ovu radnju nije
                          moguće vratiti.
                        </>
                      }
                      confirmLabel="Obriši objavu"
                      iconLabel={`Obriši "${post.title}"`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        summary={`Prikaz ${pagination.rangeStart}-${pagination.rangeEnd} od ${pagination.totalItems} objava`}
        previousHref={getPageHref(pagination.page - 1)}
        nextHref={getPageHref(pagination.page + 1)}
        ariaLabel="Paginacija objava"
      />
    </AdminPanel>
  );
}

function getPageHref(page: number) {
  return page <= 1 ? ADMIN_POSTS_PATH : `${ADMIN_POSTS_PATH}?page=${page}`;
}
