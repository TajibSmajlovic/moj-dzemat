import { useEffect, useRef } from "react";
import { Form, Link, redirect, useActionData, useFetcher, useNavigation } from "react-router";

import { Pencil, Pin, Plus, Star, Trash2 } from "lucide-react";

import { PaginationControls } from "#app/components/admin/pagination-controls";
import { PostTypeBadge } from "#app/components/posts/post-type-badge";
import { Button } from "#app/components/ui/button";
import { ConfirmAction } from "#app/components/ui/confirm-action";
import { showToast } from "#app/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#app/components/ui/table";
import { cn } from "#app/lib/cn";
import { formatDateShort } from "#app/lib/date";
import { getPaginationState, PAGE_SIZE, parsePageParam } from "#app/lib/pagination";
import { createActionToast } from "#app/lib/toast";
import { requireAdmin } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { logger } from "#app/utils/logger.server";
import { requireId } from "#app/utils/post-admin.server";

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

  throw new Response("Unsupported intent", { status: 400 });
}

export default function AdminPostsList({ loaderData }: Route.ComponentProps) {
  const { posts, pagination } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  // Show toast when the main Form (delete action) completes.
  const lastActionData = useRef(actionData);
  const deletingId =
    navigation.formData?.get("intent") === "delete"
      ? (navigation.formData.get("id") as string | null)
      : null;

  useEffect(() => {
    if (actionData && actionData !== lastActionData.current) {
      if (actionData.ok && actionData.toast) {
        showToast(actionData.toast);
      }
      lastActionData.current = actionData;
    }
  }, [actionData]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-foreground text-2xl font-semibold">Objave</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Objave na vrhu se prikazuju prve. Istaknuto se prikazuje u hero sekciji.
          </p>
        </div>
        <Button type="button" size="lg" className="gap-2 rounded-xl shadow-lg" asChild>
          <Link to="/admin/objave/nova">
            <Plus className="h-5 w-5" aria-hidden="true" />
            Nova objava
          </Link>
        </Button>
      </div>

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
      <div className="border-border bg-card rounded-2xl border p-12 text-center">
        <p className="text-muted-foreground">
          Još nema objava.{" "}
          <Link to="/admin/objave/nova" className="text-primary font-medium hover:underline">
            Dodajte prvu objavu
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      <div className="overflow-x-auto">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Objava</TableHead>
              <TableHead className="w-36">Vrsta</TableHead>
              <TableHead className="w-32">Datum</TableHead>
              <TableHead className="w-16 text-center">Slike</TableHead>
              <TableHead className="w-64 text-right">Akcije</TableHead>
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

                <TableCell className="text-muted-foreground text-sm">
                  {formatDateShort(post.publishedAt)}
                </TableCell>

                <TableCell className="text-center text-sm">{post.images.length}</TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <ToggleButton
                      intent="toggle-featured"
                      id={post.id}
                      active={post.featured}
                      title={post.featured ? "Ukloni istaknuto" : "Istakni"}
                      activeClasses="text-secondary bg-secondary/10"
                      inactiveClasses="text-muted-foreground hover:text-secondary hover:bg-secondary/10"
                    >
                      <Star className="h-4 w-4" aria-hidden="true" />
                    </ToggleButton>

                    <ToggleButton
                      intent="toggle-pinned"
                      id={post.id}
                      active={post.pinned}
                      title={post.pinned ? "Ukloni sa vrha" : "Stavi na vrh"}
                      activeClasses="text-primary bg-primary/10"
                      inactiveClasses="text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <Pin className="h-4 w-4" aria-hidden="true" />
                    </ToggleButton>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Uredi"
                      className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                      asChild
                    >
                      <Link to={`/admin/objave/${post.id}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Uredi</span>
                      </Link>
                    </Button>
                    <DeletePostButton postId={post.id} postTitle={post.title} />
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
    </div>
  );
}

function getPageHref(page: number) {
  return page <= 1 ? ADMIN_POSTS_PATH : `${ADMIN_POSTS_PATH}?page=${page}`;
}

function DeletePostButton({ postId, postTitle }: { postId: string; postTitle: string }) {
  const formId = `delete-post-${postId}`;

  return (
    <Form id={formId} method="post" className="inline">
      <input type="hidden" name="intent" value="delete" />
      <input type="hidden" name="id" value={postId} />

      <ConfirmAction
        form={formId}
        title="Obrisati objavu?"
        description={
          <>
            Objava <strong className="text-foreground">"{postTitle}"</strong> biće trajno uklonjena
            iz javne stranice i administracije. Ovu radnju nije moguće vratiti.
          </>
        }
        confirmLabel="Obriši objavu"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title={`Obriši "${postTitle}"`}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Obriši objavu</span>
        </Button>
      </ConfirmAction>
    </Form>
  );
}

type ToggleButtonProps = {
  intent: "toggle-featured" | "toggle-pinned";
  id: string;
  active: boolean;
  title: string;
  activeClasses: string;
  inactiveClasses: string;
  children: React.ReactNode;
};

function ToggleButton({
  intent,
  id,
  active,
  title,
  activeClasses,
  inactiveClasses,
  children,
}: ToggleButtonProps) {
  const fetcher = useFetcher<typeof action>();
  const optimistic =
    fetcher.formData?.get("intent") === intent && fetcher.formData.get("id") === id
      ? !active
      : active;

  const lastData = useRef(fetcher.data);
  useEffect(() => {
    if (fetcher.data && fetcher.data !== lastData.current) {
      if (fetcher.data.ok && fetcher.data.toast) {
        showToast(fetcher.data.toast);
      }
      lastData.current = fetcher.data;
    }
  }, [fetcher.data]);

  return (
    <fetcher.Form method="post" className="inline">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={id} />

      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        title={title}
        className={cn(optimistic ? activeClasses : inactiveClasses)}
      >
        {children}
        <span className="sr-only">{title}</span>
      </Button>
    </fetcher.Form>
  );
}
