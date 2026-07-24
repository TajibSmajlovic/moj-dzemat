import { href } from "react-router";

import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./utils/admin";

const SEED_MESSAGE = "Džuma namaz u 13:00";

test.describe("admin / obavijesna traka", () => {
  test("create + toggle + delete enforces the single-active invariant through the UI", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto(href("/admin/obavijesna-traka"), { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Obavijesna traka" })).toBeVisible();

    // Sanity: the seed row from globalSetup is the lone active row.
    // `exact: true` so the badge "Aktivna" doesn't also match "Neaktivna".
    const seedRow = page.getByRole("row").filter({ hasText: SEED_MESSAGE });
    await expect(seedRow).toBeVisible();
    await expect(seedRow.getByText("Aktivna", { exact: true })).toBeVisible();

    // 1. Open the "new" sheet, fill the form, mark it active, save.
    const uniqueMessage = `E2E poruka ${Date.now()}`;
    await page.getByRole("button", { name: "Nova poruka" }).click();

    const sheet = page.getByRole("dialog").filter({ hasText: "Nova poruka" });
    await expect(sheet).toBeVisible();
    await sheet.getByLabel("Poruka").fill(uniqueMessage);
    await sheet.getByLabel("Aktivna").check();

    await sheet.getByRole("button", { name: "Sačuvaj" }).click();

    // After redirectWithToast we land back on the list with the new row.
    await expect(page).toHaveURL(new RegExp(`${href("/admin/obavijesna-traka")}$`));
    const newRow = page.getByRole("row").filter({ hasText: uniqueMessage });
    await expect(newRow).toBeVisible();

    // 2. Single-active invariant: the newly active row pushed the seed
    //    into "Neaktivna".
    await expect(newRow.getByText("Aktivna", { exact: true })).toBeVisible();
    await expect(seedRow.getByText("Neaktivna")).toBeVisible();

    // 3. Toggle the seed back on. The route action is symmetrical -
    //    flipping the seed active deactivates our brand new row.
    await seedRow.getByRole("button", { name: "Aktiviraj" }).click();

    await expect(seedRow.getByText("Aktivna", { exact: true })).toBeVisible();
    await expect(newRow.getByText("Neaktivna")).toBeVisible();

    // 4. Delete the test row through the confirm dialog (Odustani branch
    //    is already covered by the post-delete test in admin.spec.ts).
    await newRow.getByRole("button", { name: "Obriši" }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm.getByRole("heading", { name: "Obrisati poruku na traci?" })).toBeVisible();
    await confirm.getByRole("button", { name: "Obriši poruku" }).click();

    // 5. State is back to where globalSetup left it: only the seed row,
    //    active. This guarantees smoke.spec runs unaffected.
    await expect(page.getByRole("row").filter({ hasText: uniqueMessage })).toHaveCount(0);
    await expect(seedRow.getByText("Aktivna", { exact: true })).toBeVisible();
  });
});
