import { expect, test } from "@playwright/test";

import { POSTS_TITLES } from "./global-setup";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAsAdmin } from "./utils/admin";
import { resetPasswordViaDevInbox } from "./utils/reset-password";

test.describe("auth", () => {
  test("unauthenticated access is redirected to login", async ({ page }) => {
    await page.goto("/admin/objave");
    await expect(page).toHaveURL(/\/prijava\?redirectTo=/);
  });

  test("admin can log in and see the post list", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page).toHaveURL(/\/admin\/objave$/);
    await expect(page.getByRole("heading", { name: "Objave" })).toBeVisible();
    await expect(page.getByRole("link", { name: POSTS_TITLES[0], exact: true })).toBeVisible();
  });

  test("admin can log out via the UI and loses access to admin routes", async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole("button", { name: "Odjava" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/admin/objave");
    await expect(page).toHaveURL(/\/prijava\?redirectTo=/);
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

    // Reset to a temporary password.
    await resetPasswordViaDevInbox(page, { email: ADMIN_EMAIL, newPassword: NEW_PASSWORD });

    // Restore the original password so subsequent tests aren't broken.
    // We have to log out first because the reset auto-logs us in, and
    // the forgot-password form doesn't care whether we're authed but
    // the auto-login on completion would otherwise no-op.
    await page.goto("/odjava");
    await resetPasswordViaDevInbox(page, { email: ADMIN_EMAIL, newPassword: ADMIN_PASSWORD });
  });
});
