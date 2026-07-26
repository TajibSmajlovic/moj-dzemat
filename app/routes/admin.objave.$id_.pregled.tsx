import { Form, href, Link, useNavigation } from "react-router";

import { Eye, EyeOff, Pencil } from "lucide-react";
import { motion } from "motion/react";

import { BackLink } from "#app/components/ui/back-link";
import { Button } from "#app/components/ui/button";
import { adminUserContext } from "#app/features/auth/auth-context";
import { PostStatusBadge } from "#app/features/posts/admin/components/post-status-badge";
import { togglePostStatus } from "#app/features/posts/admin/post-admin.server";
import { PostAdminIntents } from "#app/features/posts/admin/post-intents";
import { PostDetailArticle } from "#app/features/posts/components/post-detail-article";
import { adminPostHref, adminPostPreviewHref, postHref } from "#app/features/posts/post-routes";
import { formatPageTitle, useRootSiteName } from "#app/lib/branding";
import { requireId } from "#app/lib/id";
import { IntentInput, useIsSubmittingIntent } from "#app/lib/intent";
import { invariantResponse } from "#app/lib/invariant";
import { sectionReveal } from "#app/lib/motion";
import { ROBOTS_NOINDEX_NOFOLLOW, buildNoindexMeta } from "#app/lib/seo";
import { createActionToast } from "#app/lib/toast";
import { prisma } from "#app/server/db.server";
import { env } from "#app/server/env.server";
import { redirectWithToast } from "#app/server/toast.server";

import type { Route } from "./+types/admin.objave.$id_.pregled";

export function meta({ loaderData }: Route.MetaArgs) {
  return buildNoindexMeta(
    formatPageTitle(
      loaderData?.post ? `Pregled: ${loaderData.post.title}` : "Pregled objave",
      "Admin",
    ),
    ROBOTS_NOINDEX_NOFOLLOW,
  );
}

export async function loader({ context, params }: Route.LoaderArgs) {
  context.get(adminUserContext);

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
      videos: {
        orderBy: { position: "asc" },
        select: { id: true, providerId: true },
      },
    },
  });

  invariantResponse(post, "Objava nije pronađena.", { status: 404 });

  return { post, siteUrl: env().APP_URL };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const user = context.get(adminUserContext);
  const id = requireId(params.id);
  const formData = await request.formData();
  const intent = formData.get("intent");

  invariantResponse(intent === PostAdminIntents.ToggleStatus, "Nepodržana radnja.");

  const next = await togglePostStatus(id, user.id);

  return redirectWithToast(
    adminPostPreviewHref(id),
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
  const toggling = useIsSubmittingIntent(navigation, PostAdminIntents.ToggleStatus);
  const isPublished = post.status === "published";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <BackLink to={href("/admin/objave")} label="Nazad na listu" />
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
              <IntentInput intent={PostAdminIntents.ToggleStatus} />
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
              <Link to={adminPostHref(post.id)}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Uredi
              </Link>
            </Button>

            {isPublished ? (
              <Button type="button" variant="outline" className="gap-2" asChild>
                <Link to={postHref(post.slug)}>
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
