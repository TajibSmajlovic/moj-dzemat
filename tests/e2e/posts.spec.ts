import { expect, test } from "@playwright/test";

import {
  adminPostsPageHref,
  postHref,
  postsArchiveHref,
} from "../../app/features/posts/post-routes";
import { ADMIN_POSTS_PAGE_SIZE } from "../../app/lib/pagination";
import { ROUTES } from "../../app/lib/routes";
import { POSTS_TITLES } from "./fixtures/seed-data";
import { loginAsAdmin } from "./utils/admin";
import { fillPostForm, uploadTinyPng } from "./utils/post-form";
import {
  ADMIN_POST_EDIT_URL,
  ADMIN_POST_NEW_URL,
  ADMIN_POST_PREVIEW_URL,
  ADMIN_POSTS_INDEX_PAGE_TWO_URL,
  ADMIN_POSTS_PAGE_TWO_URL,
  ADMIN_POSTS_URL,
  createPostThroughAdmin,
  openDeleteDialogForPost,
} from "./utils/posts";

const PAGINATION_PAGE_TWO_TITLES = POSTS_TITLES.slice(ADMIN_POSTS_PAGE_SIZE);
const FIRST_PAGE_NEWEST_TITLE = POSTS_TITLES[0];

test.describe("posts", () => {
  test("admin can navigate paginated post results", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(ROUTES.adminPosts);
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(ADMIN_POSTS_URL);
    await expect(
      page.getByRole("link", { name: FIRST_PAGE_NEWEST_TITLE, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: PAGINATION_PAGE_TWO_TITLES[0], exact: true }),
    ).toHaveCount(0);

    await page.getByRole("link", { name: "Sljedeća stranica" }).click();

    await expect(page).toHaveURL(ADMIN_POSTS_PAGE_TWO_URL);
    await expect(
      page.getByRole("link", { name: PAGINATION_PAGE_TWO_TITLES[0], exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: FIRST_PAGE_NEWEST_TITLE, exact: true }),
    ).toHaveCount(0);

    await page.getByRole("link", { name: "Prethodna stranica" }).click();

    await expect(page).toHaveURL(ADMIN_POSTS_URL);
    await expect(page.getByText("Stranica 1 od 2")).toBeVisible();
    await expect(
      page.getByRole("link", { name: FIRST_PAGE_NEWEST_TITLE, exact: true }),
    ).toBeVisible();
  });

  test("admin can toggle featured state from the list with optimistic UI", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(ROUTES.adminPosts);
    await page.waitForLoadState("networkidle");

    // POSTS_TITLES[0] is the newest seeded post and lives on page 1.
    // Toggle it on then back off so the post-test DB state matches the seed.
    const targetTitle = POSTS_TITLES[0];
    if (!targetTitle) {
      throw new Error("Expected at least one seeded post to toggle.");
    }
    const targetRow = page.getByRole("row").filter({ hasText: targetTitle });
    await expect(targetRow).toBeVisible();

    await targetRow.getByRole("button", { name: "Istakni" }).click();
    await expect(page.getByText("Objava istaknuta.")).toBeVisible();
    await expect(targetRow.getByRole("button", { name: "Ukloni istaknuto" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await targetRow.getByRole("button", { name: "Ukloni istaknuto" }).click();
    await expect(page.getByText("Uklonjeno iz istaknutih.")).toBeVisible();
    await expect(targetRow.getByRole("button", { name: "Istakni" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("admin confirms deletion through the custom dialog", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(adminPostsPageHref(2));
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(ADMIN_POSTS_PAGE_TWO_URL);
    await expect(page.getByText("Stranica 2 od 2")).toBeVisible();

    const firstTitle = PAGINATION_PAGE_TWO_TITLES[0];
    if (!firstTitle) {
      throw new Error("Expected seeded page 2 posts to exist, but none were found.");
    }

    const firstPostLink = page.getByRole("link", { name: firstTitle, exact: true });
    await expect(firstPostLink).toBeVisible();

    await openDeleteDialogForPost(page, firstTitle);

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Obrisati objavu?" })).toBeVisible();
    await expect(dialog.getByText(firstTitle)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Odustani" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Obriši objavu" })).toBeVisible();

    await dialog.getByRole("button", { name: "Odustani" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(firstPostLink).toBeVisible();

    for (const [index, title] of PAGINATION_PAGE_TWO_TITLES.entries()) {
      await openDeleteDialogForPost(page, title);
      await expect(dialog.getByText(title)).toBeVisible();
      await dialog.getByRole("button", { name: "Obriši objavu" }).click();

      await expect(page.getByText(`Objava "${title}" obrisana.`)).toBeVisible();
      await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);

      if (index < PAGINATION_PAGE_TWO_TITLES.length - 1) {
        // Delete is submitted from an index-route <Form>. React Router appends
        // ?index to disambiguate index action vs parent action at the same path.
        await expect(page).toHaveURL(ADMIN_POSTS_INDEX_PAGE_TWO_URL);
        await expect(page.getByText("Stranica 2 od 2")).toBeVisible();
      } else {
        // After the last item on the page is deleted, we should be redirected to the previous page since the current page would be out of range.
        await expect(page).toHaveURL(ADMIN_POSTS_URL);
        await expect(page.getByText("Stranica 2 od 2")).toHaveCount(0);
      }
    }
  });

  test("admin can create a post", async ({ page }) => {
    const unique = Date.now();
    const title = `E2E objava ${unique}`;
    const slug = `e2e-objava-${unique}`;

    await loginAsAdmin(page);
    await createPostThroughAdmin(page, { title, slug });

    await expect(page.getByText("Objava je uspješno kreirana.")).toBeVisible();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByRole("link", { name: "Uredi" })).toBeVisible();
  });

  test("admin can publish a typed post and public visitors can find it through filters", async ({
    page,
  }) => {
    const unique = Date.now();
    const title = `E2E hutba ${unique}`;
    const slug = `e2e-hutba-${unique}`;

    await loginAsAdmin(page);
    await createPostThroughAdmin(page, {
      title,
      slug,
      type: "hutba",
      body: "Ova hutba treba biti javno dostupna samo kroz odgovarajući filter.",
    });

    await expect(page.getByText("Objava je uspješno kreirana.")).toBeVisible();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.context().clearCookies();

    await page.goto(postsArchiveHref({ activeType: "hutba" }));
    await expect(page.getByRole("heading", { name: "Sve hutbe" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();

    await page.goto(postsArchiveHref({ activeType: "sergija" }));
    await expect(page.getByRole("heading", { name: "Sve sergije" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: title })).toHaveCount(0);
  });

  test("admin can upload and remove a post image through admin flow", async ({ page }) => {
    const unique = Date.now();
    const title = `E2E objava sa slikom ${unique}`;
    const slug = `e2e-objava-slika-${unique}`;

    await loginAsAdmin(page);
    await page.goto(ROUTES.adminPostNew);
    await expect(page).toHaveURL(ADMIN_POST_NEW_URL);

    await fillPostForm(page, {
      title,
      slug,
      type: "obavijest",
      body: "E2E sadržaj sa uploadovanom slikom.",
      publish: true,
    });

    await uploadTinyPng(page);

    await page.getByRole("button", { name: "Sačuvaj" }).click();

    await expect(page).toHaveURL(new RegExp(`${postHref(slug)}$`));
    await expect(page.locator(`img[src^="${ROUTES.images}/"]`)).toHaveCount(1);
    await page.getByRole("button", { name: "Otvori sliku 1 preko cijelog ekrana" }).click();
    const lightbox = page.getByRole("dialog", { name: "Pregled slike preko cijelog ekrana" });
    await expect(lightbox).toBeVisible();
    await expect(lightbox.locator(`img[src^="${ROUTES.images}/"]`)).toBeVisible();
    await lightbox.getByRole("button", { name: "Zatvori prikaz slike" }).click();
    await expect(lightbox).toBeHidden();
    await expect(page.getByRole("link", { name: "Uredi" })).toBeVisible();

    await page.getByRole("link", { name: "Uredi" }).click();
    await expect(page).toHaveURL(ADMIN_POST_EDIT_URL);
    await expect(page.locator(`img[src^="${ROUTES.images}/"]`)).toHaveCount(1);

    await page.getByRole("button", { name: "Obriši" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading", { name: "Obrisati sliku?" })).toBeVisible();

    await dialog.getByRole("button", { name: "Obriši sliku" }).click();

    await expect(page.getByText("Slika obrisana.")).toBeVisible();
    await expect(page.locator(`img[src^="${ROUTES.images}/"]`)).toHaveCount(0);
  });

  test("admin can draft, preview, and publish post", async ({ page }) => {
    const unique = Date.now();
    const title = `E2E nacrt ${unique}`;
    const slug = `e2e-nacrt-${unique}`;

    await loginAsAdmin(page);
    await page.goto(ROUTES.adminPostNew);
    await expect(page).toHaveURL(ADMIN_POST_NEW_URL);

    await fillPostForm(page, {
      title,
      slug,
      type: "obavijest",
      body: "Ovaj tekst je prvo skriven od javnosti.",
    });

    await page.getByRole("button", { name: "Sačuvaj" }).click();

    await expect(page).toHaveURL(ADMIN_POST_PREVIEW_URL);
    await expect(page.getByText("Objava je uspješno kreirana.")).toBeVisible();
    await expect(page.getByRole("main").getByText("Neobjavljeno")).toBeVisible();
    await expect(page.getByRole("heading", { name: title }).first()).toBeVisible();

    await page.goto(ROUTES.home);
    await expect(page.getByRole("heading", { level: 3, name: title })).toHaveCount(0);

    const draftDetail = await page.goto(postHref(slug));
    expect(draftDetail?.status()).toBe(404);

    await page.goto(ROUTES.adminPosts);
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();

    const statusBadge = page
      .getByRole("row")
      .filter({ has: page.getByRole("link", { name: title, exact: true }) })
      .getByText("Neobjavljeno");
    await expect(statusBadge).toBeVisible();

    await page.getByRole("link", { name: title, exact: true }).click();
    await expect(page).toHaveURL(ADMIN_POST_EDIT_URL);
    await page.getByRole("link", { name: "Pregled" }).click();
    await expect(page).toHaveURL(ADMIN_POST_PREVIEW_URL);

    await page.getByRole("button", { name: "Objavi", exact: true }).click();
    await expect(page.getByText("Objava je objavljena.")).toBeVisible();
    await expect(page.getByRole("main").getByText("Objavljeno")).toBeVisible();

    const publishedDetail = await page.goto(postHref(slug));
    expect(publishedDetail?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });

  test("logged-in admin can edit a post from the public detail page", async ({ page }) => {
    const unique = Date.now();
    const title = `E2E objava ${unique}`;
    const slug = `e2e-objava-${unique}`;
    const updatedTitle = `Ažurirana E2E objava ${unique}`;
    const updatedSlug = `azurirana-e2e-objava-${unique}`;

    await loginAsAdmin(page);
    await createPostThroughAdmin(page, { title, slug });

    await expect(page.getByRole("link", { name: "Uredi" })).toBeVisible();
    await page.getByRole("link", { name: "Uredi" }).click();

    await expect(page).toHaveURL(ADMIN_POST_EDIT_URL);

    await fillPostForm(page, {
      title: updatedTitle,
      slug: updatedSlug,
      body: "Ažurirani E2E sadržaj objave.",
    });

    await page.getByRole("button", { name: "Spremi izmjene" }).click();

    await expect(page).toHaveURL(new RegExp(`${postHref(updatedSlug)}$`));
    await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
    await expect(page.getByText("Objava je uspješno ažurirana.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Uredi" })).toBeVisible();

    // Renaming the slug must NOT leave the old URL discoverable, otherwise
    // we'd serve duplicate content + leak draft slugs to crawlers.
    const oldSlugResponse = await page.goto(postHref(slug));
    expect(oldSlugResponse?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /Sadržaj nije pronađen/ })).toBeVisible();
  });

  test("creating a post with an already-taken slug shows an inline server-side error", async ({
    page,
  }) => {
    const unique = Date.now();
    const title = `E2E sukob ${unique}`;
    const slug = `e2e-sukob-${unique}`;

    await loginAsAdmin(page);
    await createPostThroughAdmin(page, { title, slug });

    // Now retry from the create form using the slug we just claimed.
    // Conform can't catch this client-side (it has no view of the DB),
    // so the round-trip exercises post-admin.server's slug-conflict path.
    await page.goto(ROUTES.adminPostNew);
    await fillPostForm(page, {
      title: `Drugi pokušaj ${unique}`,
      slug,
      type: "obavijest",
      body: "Pokušaj ponovne upotrebe sluga.",
    });

    await page.getByRole("button", { name: "Sačuvaj" }).click();

    // We stayed on the create page (no redirect), the slug field has
    // the conflict message, and the chosen title was preserved (Conform
    // re-renders defaultValue from lastResult).
    await expect(page).toHaveURL(ADMIN_POST_NEW_URL);
    await expect(page.getByText("Slug je već zauzet. Odaberite drugi.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Naslov" })).toHaveValue(
      `Drugi pokušaj ${unique}`,
    );
  });
});
