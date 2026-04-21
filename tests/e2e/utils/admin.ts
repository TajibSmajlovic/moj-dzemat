import { expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

export async function loginAsAdmin(page: Page) {
  await page.goto("/prijava");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Lozinka").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Prijavi se" }).click();

  await expect(page).toHaveURL(/\/admin\/objave$/);
}
