import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin } from "./utils/admin";

test.describe("posts", () => {
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
      buffer: tinyPngBuffer(),
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

  test("admin confirms deletion through the custom dialog", async ({ page }) => {
    const unique = Date.now();
    const title = `E2E objava za brisanje ${unique}`;
    const slug = `e2e-brisanje-${unique}`;

    await loginAsAdmin(page);
    await createPostThroughAdmin(page, { title, slug });

    await page.goto("/admin/objave");
    await page.waitForLoadState("networkidle");
    const postLink = page.getByRole("link", { name: title, exact: true });
    await expect(postLink).toBeVisible();

    await page.getByTitle(`Obriši "${title}"`).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Obrisati objavu?" })).toBeVisible();
    await expect(dialog.getByText(title)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Odustani" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Obriši objavu" })).toBeVisible();

    await dialog.getByRole("button", { name: "Odustani" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(postLink).toBeVisible();

    await page.getByTitle(`Obriši "${title}"`).click();
    await dialog.getByRole("button", { name: "Obriši objavu" }).click();

    await expect(page.getByText(`Objava "${title}" obrisana.`)).toBeVisible();
    await expect(postLink).toHaveCount(0);
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

function tinyPngBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Z8W0AAAAASUVORK5CYII=",
    "base64",
  );
}

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
