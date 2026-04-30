import { Form, Link, useNavigation } from "react-router";

import { Eye, EyeOff, Pencil } from "lucide-react";
import { motion } from "motion/react";

import { PostStatusBadge } from "#app/components/admin/post-status-badge";
import { PostDetailArticle } from "#app/components/posts/post-detail-article";
import { BackLink } from "#app/components/ui/back-link";
import { Button } from "#app/components/ui/button";
import { formatPageTitle, useRootSiteName } from "#app/lib/branding";
import { invariantResponse } from "#app/lib/invariant";
import { sectionReveal } from "#app/lib/motion";
import { ROBOTS_NOINDEX_NOFOLLOW } from "#app/lib/seo";
import { createActionToast } from "#app/lib/toast";
import { requireAdmin } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { env } from "#app/utils/env.server";
import { requireId, togglePostStatus } from "#app/utils/post-admin.server";
import { redirectWithToast } from "#app/utils/toast.server";

import type { Route } from "./+types/admin.objave.$id_.pregled";

export function meta({ data }: Route.MetaArgs) {
  return [
    {
      title: formatPageTitle(
        data?.post ? `Pregled: ${data.post.title}` : "Pregled objave",
        "Admin",
      ),
    },
    { name: "robots", content: ROBOTS_NOINDEX_NOFOLLOW },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const id = requireId(params.id);
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      body: true,
      type: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      pinned: true,
      images: {
        orderBy: { position: "asc" },
        select: { id: true, altText: true, width: true, height: true },
      },
    },
  });

  invariantResponse(post, "Objava nije pronađena.", { status: 404 });

  return { post, siteUrl: env().APP_URL };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAdmin(request);
  const id = requireId(params.id);
  const formData = await request.formData();
  const intent = formData.get("intent");

  invariantResponse(intent === "toggle-status", "Unsupported intent");

  const next = await togglePostStatus(id, user.id);

  return redirectWithToast(
    `/admin/objave/${id}/pregled`,
    createActionToast({
      action: "update",
      description: next === "published" ? "Objava je objavljena." : "Objava je sakrivena.",
    }),
  );
}

export default function AdminPostPreview({ loaderData }: Route.ComponentProps) {
  const { post, siteUrl } = loaderData;
  const siteName = useRootSiteName();
  const navigation = useNavigation();
  const toggling =
    navigation.state === "submitting" && navigation.formData?.get("intent") === "toggle-status";
  const isPublished = post.status === "published";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <BackLink to="/admin/objave" label="Nazad na listu" />
      </div>

      <motion.div
        {...sectionReveal}
        className="border-border bg-card mb-8 rounded-2xl border p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <PostStatusBadge status={post.status} />
              <span className="text-muted-foreground text-xs">Pregled sačuvane verzije</span>
            </div>
            <h2 className="font-display text-foreground truncate text-xl font-semibold">
              {post.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Form method="post">
              <input type="hidden" name="intent" value="toggle-status" />
              <Button type="submit" disabled={toggling} className="gap-2">
                {isPublished ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
                {toggling ? "Spremanje..." : isPublished ? "Sakrij" : "Objavi"}
              </Button>
            </Form>

            <Button type="button" variant="outline" className="gap-2" asChild>
              <Link to={`/admin/objave/${post.id}`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Uredi
              </Link>
            </Button>

            {isPublished ? (
              <Button type="button" variant="outline" className="gap-2" asChild>
                <Link to={`/objave/${post.slug}`}>
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  Javna stranica
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </motion.div>

      <PostDetailArticle post={post} siteName={siteName} siteUrl={siteUrl} showPinnedBadge />
    </main>
  );
}
