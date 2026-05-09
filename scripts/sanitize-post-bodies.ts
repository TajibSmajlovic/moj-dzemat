/**
 * One-shot data migration: re-runs `sanitizePostBody` over every post
 * row in the database so historic content (created before the
 * server-side sanitizer existed) ends up in the same canonical,
 * allow-listed HTML shape as new posts.
 *
 * Idempotent: a row whose body already matches the sanitised version is
 * skipped. Safe to run repeatedly. Run it once per environment after
 * deploying the new sanitizer:
 *
 *   tsx scripts/sanitize-post-bodies.ts          # report + apply
 *   tsx scripts/sanitize-post-bodies.ts --dry    # report only
 */

import { prisma } from "#app/utils/db.server";
import { sanitizePostBody } from "#app/utils/post-sanitize.server";

const DRY_RUN = process.argv.includes("--dry");

async function main() {
  const posts = await prisma.post.findMany({
    select: { id: true, slug: true, body: true },
  });

  let unchanged = 0;
  let updated = 0;
  let emptied = 0;

  for (const post of posts) {
    const sanitised = sanitizePostBody(post.body);

    if (sanitised === post.body) {
      unchanged += 1;
      continue;
    }

    if (sanitised === "") {
      // The original body collapsed to nothing under the allow-list.
      // Refuse to silently empty a published post; surface it instead.
      emptied += 1;
      console.warn(
        `[sanitize] post ${post.slug} (${post.id}) sanitised to empty - skipping. ` +
          `Original length=${post.body.length}.`,
      );
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `[sanitize] would update ${post.slug} (${post.id}): ` +
          `${post.body.length} -> ${sanitised.length} chars`,
      );
    } else {
      await prisma.post.update({
        where: { id: post.id },
        data: { body: sanitised },
      });
      console.log(
        `[sanitize] updated ${post.slug} (${post.id}): ` +
          `${post.body.length} -> ${sanitised.length} chars`,
      );
    }
    updated += 1;
  }

  console.log(
    `\n[sanitize] done. total=${posts.length} ` +
      `unchanged=${unchanged} ${DRY_RUN ? "would-update" : "updated"}=${updated} ` +
      `skipped-empty=${emptied}`,
  );
}

main()
  .catch((error) => {
    console.error("[sanitize] failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
