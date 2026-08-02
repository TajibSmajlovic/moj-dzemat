import { href } from "react-router";

import { expect, test } from "@playwright/test";

import { getTodayYmd } from "../../app/lib/date";
import { loginAsAdmin } from "./utils/admin";

const CURRENT_YEAR = Number(getTodayYmd().slice(0, 4));
const YEAR_END_DATE = `${CURRENT_YEAR}-12-31`;
const NEXT_YEAR_DATE = `${CURRENT_YEAR + 1}-01-01`;

test.describe("admin / važni datumi", () => {
  test("create + edit + delete keeps a yearly date in sync with the home page", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto(href("/admin/vazni-datumi"));
    await expect(page.getByRole("heading", { name: "Važni datumi" })).toBeVisible();

    const title = `E2E godišnji datum ${Date.now()}`;
    await page.getByRole("link", { name: "Novi datum" }).click();

    const sheet = page.getByRole("dialog").filter({ hasText: "Novi datum" });
    await expect(sheet).toBeVisible();
    await sheet.getByLabel("Naslov").fill(title);
    await sheet.getByLabel("Datum").fill(YEAR_END_DATE);
    await sheet.getByLabel("Ponavlja se svake godine").click();
    await sheet.getByLabel("Opis (nije obavezno)").fill("E2E opis za važan datum.");
    await sheet.getByRole("button", { name: "Sačuvaj" }).click();

    await expect(page).toHaveURL(new RegExp(`${href("/admin/vazni-datumi")}$`));
    const newRow = page.getByRole("row").filter({ hasText: title });
    await expect(newRow).toBeVisible();
    await expect(newRow.getByText("Svake godine")).toBeVisible();

    await page.goto(href("/"));
    const homeSection = page.getByRole("region", { name: "Važni datumi" });
    await expect(homeSection.getByText(title)).toBeVisible();

    await page.goto(href("/admin/vazni-datumi"));
    await page
      .getByRole("row")
      .filter({ hasText: title })
      .getByRole("link", { name: title })
      .click();

    const editSheet = page.getByRole("dialog").filter({ hasText: "Uredi datum" });
    await expect(editSheet).toBeVisible();
    await expect(editSheet.getByLabel("Ponavlja se svake godine")).toBeChecked();
    const editedTitle = `${title} (izmijenjen)`;
    await editSheet.getByLabel("Naslov").fill(editedTitle);
    await editSheet.getByRole("button", { name: "Spremi izmjene" }).click();

    await expect(page).toHaveURL(new RegExp(`${href("/admin/vazni-datumi")}$`));
    await expect(page.getByRole("row").filter({ hasText: editedTitle })).toBeVisible();

    await page.goto(href("/"));
    await expect(homeSection.getByText(editedTitle)).toBeVisible();
    await expect(homeSection.getByText(title, { exact: true })).toHaveCount(0);

    await page.goto(href("/admin/vazni-datumi"));
    const editedRow = page.getByRole("row").filter({ hasText: editedTitle });
    await editedRow.getByRole("button", { name: "Obriši" }).click();

    const confirm = page.getByRole("alertdialog");
    await expect(confirm.getByRole("heading", { name: "Obrisati važan datum?" })).toBeVisible();
    await confirm.getByRole("button", { name: "Obriši datum" }).click();

    await expect(page.getByRole("row").filter({ hasText: editedTitle })).toHaveCount(0);
  });

  test("keeps a one-time date from next year out of the current home page", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(href("/admin/vazni-datumi"));

    const title = `E2E datum naredne godine ${Date.now()}`;
    await page.getByRole("link", { name: "Novi datum" }).click();

    const sheet = page.getByRole("dialog").filter({ hasText: "Novi datum" });
    await sheet.getByLabel("Naslov").fill(title);
    await sheet.getByLabel("Datum").fill(NEXT_YEAR_DATE);
    await sheet.getByRole("button", { name: "Sačuvaj" }).click();

    const row = page.getByRole("row").filter({ hasText: title });
    await expect(row).toBeVisible();

    await page.goto(href("/"));
    await expect(page.getByRole("region", { name: "Važni datumi" }).getByText(title)).toHaveCount(
      0,
    );

    await page.goto(href("/admin/vazni-datumi"));
    await page
      .getByRole("row")
      .filter({ hasText: title })
      .getByRole("button", { name: "Obriši" })
      .click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Obriši datum" }).click();
  });
});
