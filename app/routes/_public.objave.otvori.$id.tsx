import { href, redirect } from "react-router";

import { postHref } from "#app/features/posts/post-routes";
import { requireId } from "#app/lib/id";
import { ROBOTS_NOINDEX_FOLLOW, buildNoindexMeta } from "#app/lib/seo";
import { prisma } from "#app/server/db.server";

import type { Route } from "./+types/_public.objave.otvori.$id";

export function meta() {
  return buildNoindexMeta("Otvaranje objave", ROBOTS_NOINDEX_FOLLOW);
}

export async function loader({ params }: Route.LoaderArgs) {
  const id = requireId(params.id);
  const post = await prisma.post.findFirst({
    where: { id, status: "published" },
    select: { slug: true },
  });

  return redirect(post ? postHref(post.slug) : href("/objave"), {
    headers: { "X-Robots-Tag": ROBOTS_NOINDEX_FOLLOW },
  });
}
