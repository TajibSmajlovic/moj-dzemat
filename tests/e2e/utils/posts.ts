import { expect, type Page } from "@playwright/test";

import { postHref } from "../../../app/features/posts/post-routes";
import type { PostTypeValue } from "../../../app/features/posts/post-type";
import { ROUTES } from "../../../app/lib/routes";
import { fillPostForm } from "./post-form";

export const ADMIN_POSTS_URL = new RegExp(`${ROUTES.adminPosts}$`);
export const ADMIN_POSTS_PAGE_TWO_URL = new RegExp(String.raw`${ROUTES.adminPosts}\?page=2$`);
export const ADMIN_POSTS_INDEX_PAGE_TWO_URL = new RegExp(
  String.raw`${ROUTES.adminPosts}\?index&page=2$`,
);
export const ADMIN_POST_NEW_URL = new RegExp(`${ROUTES.adminPostNew}$`);
export const ADMIN_POST_EDIT_URL = new RegExp(`${ROUTES.adminPosts}/[^/]+$`);
export const ADMIN_POST_PREVIEW_URL = new RegExp(`${ROUTES.adminPosts}/[^/]+/pregled$`);

export async function openDeleteDialogForPost(page: Page, title: string) {
  const postRow = page.getByRole("row").filter({
    has: page.getByRole("link", { name: title, exact: true }),
  });

  await postRow.getByRole("button", { name: `Obriši "${title}"`, exact: true }).click();
}

export async function createPostThroughAdmin(
  page: Page,
  options: {
    title: string;
    slug: string;
    body?: string;
    type?: PostTypeValue;
  },
) {
  await page.goto(ROUTES.adminPostNew);
  await expect(page).toHaveURL(ADMIN_POST_NEW_URL);

  await fillPostForm(page, {
    title: options.title,
    slug: options.slug,
    type: options.type ?? "obavijest",
    body: options.body ?? "Ovo je jednostavan E2E test sadržaj objave.",
    publish: true,
  });

  await page.getByRole("button", { name: "Sačuvaj" }).click();

  // Ensure the create action completed and we left the admin form route.
  await expect(page).toHaveURL(new RegExp(`${postHref(options.slug)}$`));
}
