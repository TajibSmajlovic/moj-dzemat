import { href } from "react-router";

import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./utils/admin";

test.describe("kontakt", () => {
  test.afterEach(async ({ page }) => {
    // Authenticated tests clear the singleton through its action so the
    // server-side public cache is invalidated for subsequent specs.
    const response = await page.context().request.post(href("/admin/kontakt"), {
      form: {
        intent: "save",
        showAbout: "on",
        showContact: "on",
        showImam: "on",
        showBoard: "on",
        showBank: "on",
        showLocation: "on",
      },
    });

    // Pathname and ok(), together: an unauthenticated POST follows through to
    // a 2xx login page, and a 400 save stays on this path with ok() false.
    // Either miss would skip the cache reset and leak into a later spec.
    expect(response.ok()).toBe(true);
    expect(new URL(response.url()).pathname).toBe(href("/admin/kontakt"));
  });

  test("admin can save contact info and it appears on the public page", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto(href("/admin/kontakt"));
    await expect(page.getByRole("heading", { level: 1, name: "Kontakt" })).toBeVisible();

    const uniquePhone = `+38761${String(Date.now()).slice(-6)}`;
    const uniqueAbout = `E2E kontakt opis ${Date.now()}`;

    await page.getByLabel("Tekst o džematu").fill(uniqueAbout);
    await page.getByLabel("Telefon", { exact: true }).fill(uniquePhone);
    await page.getByLabel("E-mail", { exact: true }).fill("kontakt-e2e@example.com");
    await page.getByLabel("IBAN / broj računa").fill("BA391290079401028494");
    await page.getByLabel("Primalac").fill("Džemat E2E");

    await page.getByRole("button", { name: "Spremi izmjene" }).click();
    await expect(page.getByText("Kontakt informacije su uspješno sačuvane.")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${href("/admin/kontakt")}$`));

    await page.goto(href("/kontakt"));
    await expect(page.getByRole("heading", { name: "O džematu i kontakt" })).toBeVisible();
    await expect(page.getByText(uniqueAbout)).toBeVisible();
    await expect(page.getByRole("link", { name: uniquePhone })).toBeVisible();
    await expect(page.getByText("BA39 1290 0794 0102 8494")).toBeVisible();

    await page.goto(href("/"));
    await expect(page.getByRole("heading", { name: "Informacije o džematu" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pogledaj kontakt" })).toBeVisible();
  });
});
