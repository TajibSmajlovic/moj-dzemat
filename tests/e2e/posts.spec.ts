import { expect, test, type Page } from "@playwright/test";

import { PAGE_SIZE } from "../../app/lib/pagination";
import { POSTS_TITLES } from "./global-setup";
import { loginAsAdmin } from "./utils/admin";
import { fillPostForm, uploadTinyPng } from "./utils/post-form";

const PAGINATION_PAGE_TWO_TITLES = POSTS_TITLES.slice(PAGE_SIZE);
const FIRST_PAGE_NEWEST_TITLE = POSTS_TITLES[0];
const FIRST_PAGE_OLDEST_TITLE = POSTS_TITLES[PAGE_SIZE - 1];

test.describe("posts", () => {
  test("admin can navigate paginated post results", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/objave");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/admin\/objave$/);
    await expect(page.getByText("Stranica 1 od 2")).toBeVisible();
    await expect(page.getByText("Prikaz 1-20 od 24 objava")).toBeVisible();
    await expect(
      page.getByRole("link", { name: FIRST_PAGE_NEWEST_TITLE, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: FIRST_PAGE_OLDEST_TITLE, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: PAGINATION_PAGE_TWO_TITLES[0], exact: true }),
    ).toHaveCount(0);

    await page.getByRole("link", { name: "Sljedeća stranica" }).click();

    await expect(page).toHaveURL(/\/admin\/objave\?page=2$/);
    await expect(page.getByText("Stranica 2 od 2")).toBeVisible();
    await expect(page.getByText("Prikaz 21-24 od 24 objava")).toBeVisible();
    await expect(
      page.getByRole("link", { name: PAGINATION_PAGE_TWO_TITLES[0], exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: PAGINATION_PAGE_TWO_TITLES.at(-1)!, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: FIRST_PAGE_NEWEST_TITLE, exact: true }),
    ).toHaveCount(0);

    await page.getByRole("link", { name: "Prethodna stranica" }).click();

    await expect(page).toHaveURL(/\/admin\/objave$/);
    await expect(page.getByText("Stranica 1 od 2")).toBeVisible();
    await expect(
      page.getByRole("link", { name: FIRST_PAGE_NEWEST_TITLE, exact: true }),
    ).toBeVisible();
  });

  test("admin can toggle featured / pinned / status from the list with optimistic UI", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/objave");
    await page.waitForLoadState("networkidle");

    // POSTS_TITLES[0] is the newest seeded post and lives on page 1.
    // Each flag is toggled on then back off so the post-test DB state
    // matches the seed (the delete test that follows targets page 2,
    // which is unaffected, but we still want to be neighbourly).
    const targetTitle = POSTS_TITLES[0];
    if (!targetTitle) {
      throw new Error("Expected at least one seeded post to toggle.");
    }
    const targetRow = page.getByRole("row").filter({ hasText: targetTitle });
    await expect(targetRow).toBeVisible();

    // Featured: starts off → on → off.
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

    // Pinned: starts off → on → off.
    await targetRow.getByRole("button", { name: "Stavi na vrh" }).click();
    await expect(page.getByText("Objava je stavljena na vrh.")).toBeVisible();
    await expect(targetRow.getByRole("button", { name: "Ukloni sa vrha" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await targetRow.getByRole("button", { name: "Ukloni sa vrha" }).click();
    await expect(page.getByText("Objava više nije na vrhu.")).toBeVisible();
    await expect(targetRow.getByRole("button", { name: "Stavi na vrh" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Status: schema defaults posts to "published", so the active button
    // reads "Sakrij objavu". Hide it then re-publish to restore.
    await targetRow.getByRole("button", { name: "Sakrij objavu" }).click();
    await expect(page.getByText("Objava je sakrivena.")).toBeVisible();
    await expect(targetRow.getByRole("button", { name: "Objavi" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await targetRow.getByRole("button", { name: "Objavi" }).click();
    await expect(page.getByText("Objava je objavljena.")).toBeVisible();
    await expect(targetRow.getByRole("button", { name: "Sakrij objavu" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("admin confirms deletion through the custom dialog", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/objave?page=2");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/admin\/objave\?page=2$/);
    await expect(page.getByText("Stranica 2 od 2")).toBeVisible();

    const firstTitle = PAGINATION_PAGE_TWO_TITLES[0];
    if (!firstTitle) {
      throw new Error("Expected seeded page 2 posts to exist, but none were found.");
    }

    const firstPostLink = page.getByRole("link", { name: firstTitle, exact: true });
    await expect(firstPostLink).toBeVisible();

    await page.getByTitle(`Obriši "${firstTitle}"`).click();

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
      await page.getByTitle(`Obriši "${title}"`).click();
      await expect(dialog.getByText(title)).toBeVisible();
      await dialog.getByRole("button", { name: "Obriši objavu" }).click();

      await expect(page.getByText(`Objava "${title}" obrisana.`)).toBeVisible();
      await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);

      if (index < PAGINATION_PAGE_TWO_TITLES.length - 1) {
        // Delete is submitted from an index-route <Form>. React Router appends
        // ?index to disambiguate index action vs parent action at the same path.
        await expect(page).toHaveURL(/\/admin\/objave\?index&page=2$/);
        await expect(page.getByText("Stranica 2 od 2")).toBeVisible();
      } else {
        // After the last item on the page is deleted, we should be redirected to the previous page since the current page would be out of range.
        await expect(page).toHaveURL(/\/admin\/objave$/);
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

  test("admin can upload and remove a post image through admin flow", async ({ page }) => {
    const unique = Date.now();
    const title = `E2E objava sa slikom ${unique}`;
    const slug = `e2e-objava-slika-${unique}`;

    await loginAsAdmin(page);
    await page.goto("/admin/objave/nova");
    await expect(page).toHaveURL(/\/admin\/objave\/nova$/);

    await fillPostForm(page, {
      title,
      slug,
      type: "obavijest",
      body: "E2E sadržaj sa uploadovanom slikom.",
      publish: true,
    });

    await uploadTinyPng(page);

    await page.getByRole("button", { name: "Sačuvaj" }).click();

    await expect(page).toHaveURL(new RegExp(`/objave/${slug}$`));
    await expect(page.locator('img[src^="/slike/"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Otvori sliku 1 preko cijelog ekrana" }).click();
    const lightbox = page.getByRole("dialog", { name: "Pregled slike preko cijelog ekrana" });
    await expect(lightbox).toBeVisible();
    await expect(lightbox.locator('img[src^="/slike/"]')).toBeVisible();
    await lightbox.getByRole("button", { name: "Zatvori prikaz slike" }).click();
    await expect(lightbox).toBeHidden();
    await expect(page.getByRole("link", { name: "Uredi" })).toBeVisible();

    await page.getByRole("link", { name: "Uredi" }).click();
    await expect(page).toHaveURL(/\/admin\/objave\/[^/]+$/);
    await expect(page.locator('img[src^="/slike/"]')).toHaveCount(1);

    await page.getByRole("button", { name: "Obriši" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading", { name: "Obrisati sliku?" })).toBeVisible();

    await dialog.getByRole("button", { name: "Obriši sliku" }).click();

    await expect(page.getByText("Slika obrisana.")).toBeVisible();
    await expect(page.locator('img[src^="/slike/"]')).toHaveCount(0);
  });

  test("admin can draft, preview, and publish post", async ({ page }) => {
    const unique = Date.now();
    const title = `E2E nacrt ${unique}`;
    const slug = `e2e-nacrt-${unique}`;

    await loginAsAdmin(page);
    await page.goto("/admin/objave/nova");
    await expect(page).toHaveURL(/\/admin\/objave\/nova$/);

    await fillPostForm(page, {
      title,
      slug,
      type: "obavijest",
      body: "Ovaj tekst je prvo skriven od javnosti.",
    });

    await page.getByRole("button", { name: "Sačuvaj" }).click();

    await expect(page).toHaveURL(/\/admin\/objave\/[^/]+\/pregled$/);
    await expect(page.getByText("Objava je uspješno kreirana.")).toBeVisible();
    await expect(page.getByText("Neobjavljeno").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: title }).first()).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 3, name: title })).toHaveCount(0);

    const draftDetail = await page.goto(`/objave/${slug}`);
    expect(draftDetail?.status()).toBe(404);

    await page.goto("/admin/objave");
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
    await expect(page.getByText("Neobjavljeno").first()).toBeVisible();

    await page.getByRole("link", { name: title, exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/objave\/[^/]+$/);
    await page.getByRole("link", { name: "Pregled" }).click();
    await expect(page).toHaveURL(/\/admin\/objave\/[^/]+\/pregled$/);

    await page.getByRole("button", { name: "Objavi", exact: true }).click();
    await expect(page.getByText("Objava je objavljena.")).toBeVisible();
    await expect(page.getByText("Objavljeno").first()).toBeVisible();

    const publishedDetail = await page.goto(`/objave/${slug}`);
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

    await expect(page).toHaveURL(/\/admin\/objave\/[^/]+$/);

    await fillPostForm(page, {
      title: updatedTitle,
      slug: updatedSlug,
      body: "Ažurirani E2E sadržaj objave.",
    });

    await page.getByRole("button", { name: "Spremi izmjene" }).click();

    await expect(page).toHaveURL(new RegExp(`/objave/${updatedSlug}$`));
    await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
    await expect(page.getByText("Objava je uspješno ažurirana.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Uredi" })).toBeVisible();

    // Renaming the slug must NOT leave the old URL discoverable, otherwise
    // we'd serve duplicate content + leak draft slugs to crawlers.
    const oldSlugResponse = await page.goto(`/objave/${slug}`);
    expect(oldSlugResponse?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /Stranica nije pronađena/ })).toBeVisible();
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
    await page.goto("/admin/objave/nova");
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
    await expect(page).toHaveURL(/\/admin\/objave\/nova$/);
    await expect(page.getByText("Slug je već zauzet. Odaberite drugi.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Naslov" })).toHaveValue(
      `Drugi pokušaj ${unique}`,
    );
  });
});

async function createPostThroughAdmin(
  page: Page,
  options: {
    title: string;
    slug: string;
    body?: string;
  },
) {
  await page.goto("/admin/objave/nova");
  await expect(page).toHaveURL(/\/admin\/objave\/nova$/);

  await fillPostForm(page, {
    title: options.title,
    slug: options.slug,
    type: "obavijest",
    body: options.body ?? "Ovo je jednostavan E2E test sadržaj objave.",
    publish: true,
  });

  await page.getByRole("button", { name: "Sačuvaj" }).click();

  // Ensure the create action completed and we left the admin form route.
  await expect(page).toHaveURL(new RegExp(`/objave/${options.slug}$`));
}
