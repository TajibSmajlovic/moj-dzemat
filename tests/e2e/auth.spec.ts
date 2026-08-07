import { href } from "react-router";

import { expect, test } from "@playwright/test";

import { prisma } from "../../app/server/db.server";
import { ensureAdmin } from "./fixtures/seed-admin";
import { POSTS_TITLES } from "./fixtures/seed-posts";
import { ADMIN_EMAIL, loginAsAdmin } from "./utils/admin";
import { resetPasswordViaDevInbox } from "./utils/reset-password";

test.describe("auth", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("unauthenticated access is redirected to login", async ({ page }) => {
    await page.goto(href("/admin/objave"));
    await expect(page).toHaveURL(new RegExp(String.raw`${href("/prijava")}\?redirectTo=`));
  });

  test("admin can log in and see the post list", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page).toHaveURL(new RegExp(`${href("/admin/objave")}$`));
    await expect(page.getByRole("heading", { name: "Objave" })).toBeVisible();
    await expect(page.getByRole("link", { name: POSTS_TITLES[0], exact: true })).toBeVisible();
  });

  test("logged-in admin is redirected away from login page", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto(href("/prijava"));
    await expect(page).toHaveURL(new RegExp(`${href("/admin/objave")}$`));
    await expect(page.getByRole("heading", { name: "Objave" })).toBeVisible();
  });

  test("admin can log out via the UI and loses access to admin routes", async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole("button", { name: "Odjava" }).click();
    await expect(page).toHaveURL(href("/"));

    await page.goto(href("/admin/objave"));
    await expect(page).toHaveURL(new RegExp(String.raw`${href("/prijava")}\?redirectTo=`));
  });

  test("login form shows a generic form-level error on wrong credentials", async ({ page }) => {
    await page.goto(href("/prijava"));
    await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
    await page.getByLabel("Lozinka").fill("definitelyWrong42!");
    await page.getByRole("button", { name: "Prijavi se" }).click();

    // Login action returns submission.reply({ formErrors: [...] }), which
    // the page renders inside an Alert (role="alert"). The message is
    // intentionally generic so we don't leak whether the email exists.
    await expect(page).toHaveURL(new RegExp(`${href("/prijava")}$`));
    await expect(page.getByRole("alert")).toContainText("Pogrešna e-mail adresa ili lozinka.");
  });

  test("forgot-password flow emits a reset email captured by /dev/last-email", async ({ page }) => {
    const NEW_PASSWORD = "novaSigurnaLozinka2026";

    try {
      // Reset to a temporary password.
      await resetPasswordViaDevInbox(page, { email: ADMIN_EMAIL, newPassword: NEW_PASSWORD });

      // The reset auto-logs us in, so the admin area proves the new password
      // produced a real session, and logging out proves it can be ended.
      await page.goto(href("/admin/objave"));
      await page.getByRole("button", { name: "Odjava" }).click();
      await expect(page).toHaveURL(href("/"));
    } finally {
      // Restore the seeded password even when something above failed. Every
      // later spec signs in with it, so leaving it changed would turn one
      // failure here into a suite-wide cascade.
      //
      // The restore writes to the database instead of driving the reset flow
      // a second time. Re-running the UI would depend on the very machinery
      // that just failed, and a throw in `finally` would bury the original
      // error. Cookies go too, so the session issued by the reset above does
      // not leak into the next test.
      await ensureAdmin();
      await page.context().clearCookies();
    }
  });
});
