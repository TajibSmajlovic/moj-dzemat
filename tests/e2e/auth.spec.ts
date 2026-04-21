import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./utils/admin";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

test.describe("auth", () => {
  test("unauthenticated access is redirected to login", async ({ page }) => {
    await page.goto("/admin/objave");
    await expect(page).toHaveURL(/\/prijava\?redirectTo=/);
  });

  test("admin can log in and see the post list", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page).toHaveURL(/\/admin\/objave$/);
    await expect(page.getByRole("heading", { name: "Objave" })).toBeVisible();
    await expect(page.getByText("Dobrodošli u džemat")).toBeVisible();
  });

  test("login form shows a generic form-level error on wrong credentials", async ({ page }) => {
    await page.goto("/prijava");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Lozinka").fill("definitelyWrong42!");
    await page.getByRole("button", { name: "Prijavi se" }).click();

    // Login action returns submission.reply({ formErrors: [...] }), which
    // the page renders inside an Alert (role="alert"). The message is
    // intentionally generic so we don't leak whether the email exists.
    await expect(page).toHaveURL(/\/prijava$/);
    await expect(page.getByRole("alert")).toContainText("Pogrešan email ili lozinka.");
  });

  test("forgot-password flow emits a reset email captured by /dev/last-email", async ({ page }) => {
    const NEW_PASSWORD = "novaSigurnaLozinka2026";

    // 1. Submit the forgot-password form
    await page.goto("/zaboravljena-lozinka");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByRole("button", { name: "Pošalji link" }).click();

    // 2. Confirm the success screen (identical regardless of email existence)
    await expect(page.getByRole("heading", { name: "Provjerite email" })).toBeVisible();

    // 3. Open the dev inbox and poll (with reloads) until the email is captured.
    //    The server buffers the email async, so it may not appear immediately.
    await page.goto("/dev/last-email");
    await expect
      .poll(
        async () => {
          await page.reload();
          return page.getByText("Reset link prepoznat").isVisible();
        },
        { timeout: 10_000 },
      )
      .toBe(true);
    await expect(page.getByText("Postavljanje nove lozinke")).toBeVisible();

    // 4. Follow the reset link from the captured email
    await page.getByRole("link", { name: "Otvori reset link" }).click();
    await expect(page).toHaveURL(/\/nova-lozinka\//);
    await expect(page.getByRole("heading", { name: "Nova lozinka" })).toBeVisible();

    // 5. Set a new password
    await page.getByLabel("Nova lozinka").fill(NEW_PASSWORD);
    await page.getByLabel("Potvrdite lozinku").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Spremi i prijavi se" }).click();

    // 6. Auto-logged in → redirected to admin
    await expect(page).toHaveURL(/\/admin/);

    // 7. Restore the original password so subsequent tests aren't broken.
    //    Log out, reset again with the new password, then set back original.
    await page.goto("/odjava");
    await page.goto("/zaboravljena-lozinka");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByRole("button", { name: "Pošalji link" }).click();

    await expect(page.getByRole("heading", { name: "Provjerite email" })).toBeVisible();
    await page.goto("/dev/last-email");
    await expect
      .poll(
        async () => {
          await page.reload();
          return page.getByText("Reset link prepoznat").isVisible();
        },
        { timeout: 10_000 },
      )
      .toBe(true);

    await page.getByRole("link", { name: "Otvori reset link" }).click();
    await expect(page).toHaveURL(/\/nova-lozinka\//);

    await page.getByLabel("Nova lozinka").fill(ADMIN_PASSWORD);
    await page.getByLabel("Potvrdite lozinku").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Spremi i prijavi se" }).click();

    await expect(page).toHaveURL(/\/admin/);
  });
});
