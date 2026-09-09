import { expect, test } from "@playwright/test";

import { postHref } from "../../app/features/posts/post-routes";
import { prisma } from "../../app/server/db.server";
import { createPost } from "../factories";
import { TINY_PNG_BASE64 } from "../helpers/png";

test.afterAll(async () => {
  await prisma.$disconnect();
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
]) {
  test.describe(`post media at ${viewport.width}px`, () => {
    test.use({ viewport, contextOptions: { reducedMotion: "reduce" } });

    for (const imageCount of [1, 2]) {
      test(`${imageCount} image lightbox contains focus and restores the opener`, async ({
        page,
      }) => {
        const post = await createPost({
          title: "Galerija zajednice",
          slug: `e2e-lightbox-${viewport.width}-${imageCount}`,
          status: "published",
        });

        try {
          const data = Buffer.from(TINY_PNG_BASE64, "base64");
          await prisma.postImage.createMany({
            data: Array.from({ length: imageCount }, (_, index) => ({
              postId: post.id,
              data,
              contentType: "image/png",
              byteSize: data.byteLength,
              width: 1,
              height: 1,
              altText: `Slika zajednice ${index + 1}`,
              position: index,
            })),
          });

          await page.goto(postHref(post.slug));
          const opener = page.getByRole("button", { name: "Otvori sliku 1: Slika zajednice 1" });
          await opener.focus();
          await page.keyboard.press("Enter");

          const dialog = page.getByRole("dialog", { name: "Pregled slike preko cijelog ekrana" });
          const close = dialog.getByRole("button", { name: "Zatvori prikaz slike" });
          await expect(dialog).toBeVisible();
          await expect(close).toBeFocused();
          expect(
            await dialog.evaluate((element) => element.contains(document.elementFromPoint(1, 1))),
          ).toBe(true);

          await page.keyboard.press("Shift+Tab");
          await expect(
            imageCount === 1 ? close : dialog.getByRole("button", { name: "Sljedeća slika" }),
          ).toBeFocused();
          await page.keyboard.press("Tab");
          await expect(close).toBeFocused();

          if (imageCount === 2) {
            await page.keyboard.press("ArrowLeft");
            await expect(dialog.getByText("Slika 2 od 2")).toBeVisible();
            await page.keyboard.press("ArrowRight");
            await expect(dialog.getByText("Slika 1 od 2")).toBeVisible();
          }

          await page.keyboard.press("Escape");
          await expect(dialog).toHaveCount(0);
          await expect(opener).toBeFocused();

          if (imageCount === 2) {
            await page.getByRole("button", { name: "Sljedeći slajd" }).click();
            const secondOpener = page.getByRole("button", {
              name: "Otvori sliku 2: Slika zajednice 2",
            });
            await secondOpener.click();
            await expect(close).toBeFocused();
            await close.click();
            await expect(dialog).toHaveCount(0);
            await expect(secondOpener).toBeFocused();
          }
        } finally {
          await prisma.post.delete({ where: { id: post.id } });
        }
      });
    }
  });
}
