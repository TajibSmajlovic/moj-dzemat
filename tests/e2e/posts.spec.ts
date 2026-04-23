import { expect, test, type Page } from "@playwright/test";

import { PAGE_SIZE } from "../../app/lib/pagination";
import { POSTS_TITLES } from "./global-setup";
import { loginAsAdmin } from "./utils/admin";

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

    await page.getByRole("textbox", { name: "Naslov" }).fill(title);
    await page.getByLabel("URL slug").fill(slug);
    await page.getByLabel("Vrsta").selectOption("obavijest");
    await page.locator(".ProseMirror").waitFor({ state: "visible" });
    await page.locator(".ProseMirror").fill("E2E sadržaj sa uploadovanom slikom.");

    await page.locator('input[type="file"][name="images"]').setInputFiles({
      name: "e2e-image.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Z8W0AAAAASUVORK5CYII=",
        "base64",
      ),
    });

    await page.getByRole("button", { name: "Sačuvaj" }).click();

    await expect(page).toHaveURL(new RegExp(`/objave/${slug}$`));
    await expect(page.locator('img[src^="/slike/"]')).toHaveCount(1);
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

    await page.getByRole("textbox", { name: "Naslov" }).fill(updatedTitle);
    await page.getByLabel("URL slug").fill(updatedSlug);
    await page.locator(".ProseMirror").waitFor({ state: "visible" });
    await page.locator(".ProseMirror").fill("Ažurirani E2E sadržaj objave.");

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
    await page.getByRole("textbox", { name: "Naslov" }).fill(`Drugi pokušaj ${unique}`);
    await page.getByLabel("URL slug").fill(slug);
    await page.getByLabel("Vrsta").selectOption("obavijest");
    await page.locator(".ProseMirror").fill("Pokušaj ponovne upotrebe sluga.");

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

  await page.getByRole("textbox", { name: "Naslov" }).fill(options.title);
  await page.getByLabel("URL slug").fill(options.slug);
  await page.getByLabel("Vrsta").selectOption("obavijest");
  await page.locator(".ProseMirror").waitFor({ state: "visible" });
  await page
    .locator(".ProseMirror")
    .fill(options.body ?? "Ovo je jednostavan E2E test sadržaj objave.");

  await page.getByRole("button", { name: "Sačuvaj" }).click();

  // Ensure the create action completed and we left the admin form route.
  await expect(page).toHaveURL(new RegExp(`/objave/${options.slug}$`));
}
