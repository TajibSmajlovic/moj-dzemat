import { Link } from "react-router";

import { Eye, EyeOff, ImageIcon, Pencil, Pin, Star } from "lucide-react";

import { AdminPanel } from "#app/components/admin/admin-panel";
import { DeleteRecordButton } from "#app/components/admin/delete-record-button";
import { EmptyState } from "#app/components/admin/empty-state";
import { IconActionButton } from "#app/components/admin/icon-action-button";
import { OptimisticToggleIconButton } from "#app/components/admin/optimistic-toggle-button";
import { PaginationControls } from "#app/components/admin/pagination-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#app/components/ui/table";
import { PostStatusBadge } from "#app/features/posts/admin/components/post-status-badge";
import { PostAdminIntents } from "#app/features/posts/admin/post-intents";
import { PostTypeBadge } from "#app/features/posts/components/post-type-badge";
import type { PostStatusValue } from "#app/features/posts/post-status";
import type { PostTypeValue } from "#app/features/posts/post-type";
import { cn } from "#app/lib/cn";
import { formatDateShort } from "#app/lib/date";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  type: PostTypeValue;
  status: PostStatusValue;
  publishedAt: Date;
  featured: boolean;
  pinned: boolean;
  images: { id: string }[];
};

type PaginationState = {
  page: number;
  totalPages: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
};

type Props = {
  posts: PostRow[];
  pagination: PaginationState;
  deletingId: string | null;
  getPageHref: (page: number) => string;
};

export function PostsAdminTable({ posts, pagination, deletingId, getPageHref }: Props) {
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
    <AdminPanel className="md:bg-card overflow-visible rounded-none border-0 bg-transparent shadow-none md:overflow-hidden md:rounded-2xl md:border md:shadow-sm">
      <div className="grid gap-3 md:hidden">
        {posts.map((post) => (
          <PostMobileCard key={post.id} post={post} deleting={deletingId === post.id} />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
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
                  <PostRowActions post={post} />
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

function PostMobileCard({ post, deleting }: { post: PostRow; deleting: boolean }) {
  return (
    <article
      className={cn(
        "border-border/70 bg-card min-w-0 rounded-xl border p-4 shadow-sm",
        post.pinned && "ring-primary/10 ring-1",
        deleting && "opacity-50",
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <PostFlags featured={post.featured} pinned={post.pinned} />
        <PostStatusBadge status={post.status} />
      </div>

      <Link
        to={`/admin/objave/${post.id}`}
        className="font-display hover:text-primary mt-3 block min-w-0 text-lg leading-tight font-semibold text-pretty transition-colors"
      >
        <span className="line-clamp-2">{post.title}</span>
      </Link>
      <p className="text-muted-foreground mt-1 truncate text-xs">/{post.slug}</p>

      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
        <PostTypeBadge type={post.type} />
        <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
          {formatDateShort(post.publishedAt)}
        </span>
        <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {post.images.length}
        </span>
      </div>

      <div className="border-border/60 mt-4 border-t pt-3">
        <PostRowActions post={post} mobile />
      </div>
    </article>
  );
}

function PostFlags({ featured, pinned }: { featured: boolean; pinned: boolean }) {
  if (!featured && !pinned) return null;

  return (
    <>
      {featured ? (
        <span className="bg-secondary/10 text-secondary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
          <Star className="h-3 w-3 fill-current" aria-hidden="true" />
          Istaknuto
        </span>
      ) : null}
      {pinned ? (
        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
          <Pin className="h-3 w-3 fill-current" aria-hidden="true" />
          Na vrhu
        </span>
      ) : null}
    </>
  );
}

function PostRowActions({ post, mobile = false }: { post: PostRow; mobile?: boolean }) {
  const actionClassName = mobile ? "size-10 rounded-full" : undefined;

  return (
    <div
      className={
        mobile
          ? "grid w-full grid-cols-5 place-items-center gap-2"
          : "flex items-center justify-end gap-1"
      }
    >
      <OptimisticToggleIconButton
        intent={PostAdminIntents.ToggleFeatured}
        id={post.id}
        active={post.featured}
        tone="secondary"
        activeLabel="Ukloni istaknuto"
        inactiveLabel="Istakni"
        activeIcon={<Star className="h-4 w-4" aria-hidden="true" />}
        className={actionClassName}
      />

      <OptimisticToggleIconButton
        intent={PostAdminIntents.TogglePinned}
        id={post.id}
        active={post.pinned}
        tone="primary"
        activeLabel="Ukloni sa vrha"
        inactiveLabel="Stavi na vrh"
        activeIcon={<Pin className="h-4 w-4" aria-hidden="true" />}
        className={actionClassName}
      />

      <OptimisticToggleIconButton
        intent={PostAdminIntents.ToggleStatus}
        id={post.id}
        active={post.status === "published"}
        tone="primary"
        activeLabel="Sakrij objavu"
        inactiveLabel="Objavi"
        activeIcon={<Eye className="h-4 w-4" aria-hidden="true" />}
        inactiveIcon={<EyeOff className="h-4 w-4" aria-hidden="true" />}
        className={actionClassName}
      />

      <IconActionButton label="Uredi" tone="primary" className={actionClassName} asChild>
        <Link to={`/admin/objave/${post.id}`}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Link>
      </IconActionButton>

      <DeleteRecordButton
        id={post.id}
        formIdPrefix={mobile ? "delete-post-card" : "delete-post"}
        intent={PostAdminIntents.Delete}
        title="Obrisati objavu?"
        description={
          <>
            Objava <strong className="text-foreground">"{post.title}"</strong> biće trajno uklonjena
            iz javne stranice i administracije. Ovu radnju nije moguće vratiti.
          </>
        }
        confirmLabel="Obriši objavu"
        iconLabel={`Obriši "${post.title}"`}
        className={actionClassName}
      />
    </div>
  );
}
