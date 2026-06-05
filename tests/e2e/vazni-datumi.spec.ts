import { expect, test } from "@playwright/test";

import { ROUTES } from "../../app/lib/routes";
import { loginAsAdmin } from "./utils/admin";

// A far-future date is always "upcoming", so the row reliably shows in the
// home "Važni datumi" section regardless of when the suite runs.
const FUTURE_DATE = "2099-12-31";

test.describe("admin / važni datumi", () => {
  test("create + edit + delete keeps the home section in sync", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto(ROUTES.adminImportantDates);
    await expect(page.getByRole("heading", { name: "Važni datumi" })).toBeVisible();

    // 1. Create a new date through the sheet.
    const title = `E2E važan datum ${Date.now()}`;
    await page.getByRole("link", { name: "Novi datum" }).click();

    const sheet = page.getByRole("dialog").filter({ hasText: "Novi datum" });
    await expect(sheet).toBeVisible();
    await sheet.getByLabel("Naslov").fill(title);
    await sheet.getByLabel("Datum").fill(FUTURE_DATE);
    await sheet.getByLabel("Opis (opcionalno)").fill("E2E opis za važan datum.");
    await sheet.getByRole("button", { name: "Sačuvaj" }).click();

    await expect(page).toHaveURL(new RegExp(`${ROUTES.adminImportantDates}$`));
    const newRow = page.getByRole("row").filter({ hasText: title });
    await expect(newRow).toBeVisible();

    // The new date shows on the public home page.
    await page.goto(ROUTES.home);
    const homeSection = page.getByRole("region", { name: "Važni datumi" });
    await expect(homeSection.getByText(title)).toBeVisible();

    // 2. Edit the title; the home page reflects the new title, not the old.
    await page.goto(ROUTES.adminImportantDates);
    await newRow.getByRole("link", { name: title }).click();

    const editSheet = page.getByRole("dialog").filter({ hasText: "Uredi datum" });
    await expect(editSheet).toBeVisible();
    const editedTitle = `${title} (izmijenjen)`;
    await editSheet.getByLabel("Naslov").fill(editedTitle);
    await editSheet.getByRole("button", { name: "Spremi izmjene" }).click();

    await expect(page).toHaveURL(new RegExp(`${ROUTES.adminImportantDates}$`));
    await expect(page.getByRole("row").filter({ hasText: editedTitle })).toBeVisible();

    await page.goto(ROUTES.home);
    await expect(homeSection.getByText(editedTitle)).toBeVisible();
    await expect(homeSection.getByText(title, { exact: true })).toHaveCount(0);

    // 3. Delete the row through the confirm dialog; it disappears from home.
    await page.goto(ROUTES.adminImportantDates);
    const editedRow = page.getByRole("row").filter({ hasText: editedTitle });
    await editedRow.getByRole("button", { name: "Obriši" }).click();

    const confirm = page.getByRole("alertdialog");
    await expect(confirm.getByRole("heading", { name: "Obrisati važan datum?" })).toBeVisible();
    await confirm.getByRole("button", { name: "Obriši datum" }).click();

    await expect(page.getByRole("row").filter({ hasText: editedTitle })).toHaveCount(0);

    await page.goto(ROUTES.home);
    await expect(page.getByText(editedTitle)).toHaveCount(0);
  });
});
