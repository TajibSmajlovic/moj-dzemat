import { href } from "react-router";

import { expect, type Page } from "@playwright/test";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing env var ${name}. Did Playwright globalSetup run? See tests/e2e/global-setup.ts.`,
    );
  }

  return value;
}

/**
   Seeded admin credentials. `tests/e2e/global-setup.ts` writes them
   onto `process.env` after the migration + seed step; we read them
   eagerly here so a misconfigured suite fails loudly at module load
   instead of submitting empty form fields and producing a confusing
   "wrong credentials" assertion later.
 */
export const ADMIN_EMAIL = requireEnv("E2E_ADMIN_EMAIL");
const ADMIN_PASSWORD = requireEnv("E2E_ADMIN_PASSWORD");

export async function loginAsAdmin(page: Page) {
  await page.goto(href("/prijava"));
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Lozinka").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Prijavi se" }).click();

  await expect(page).toHaveURL(new RegExp(`${href("/admin/objave")}$`));
}
