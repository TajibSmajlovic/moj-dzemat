import { expect, type Page } from "@playwright/test";

import { ROUTES } from "../../../app/lib/routes";

type ResetOptions = {
  email: string;
  newPassword: string;
};

/**
   Drives the full forgot-password → dev-inbox → set-new-password flow
   end-to-end. Polls `/dev/last-email` until the captured email arrives
   (the server buffers the send asynchronously), follows the reset
   link, sets the new password, and waits for the auto-login redirect
   to the admin area.

   The caller is responsible for any precondition such as logging out
   before re-running this for state restoration. The success screen and
   dev-inbox content strings mirror the production UI; if they change,
   update them here in one place.
 */

export async function resetPasswordViaDevInbox(page: Page, { email, newPassword }: ResetOptions) {
  await page.goto(ROUTES.forgotPassword);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Pošalji link" }).click();

  // The success screen is identical regardless of whether the email
  // exists (the route is intentionally constant-time-ish at the UI).
  await expect(page.getByRole("heading", { name: "Provjerite email" })).toBeVisible();

  await page.goto(ROUTES.devLastEmail);
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
  await expect(page).toHaveURL(new RegExp(`${ROUTES.newPassword}/`));

  await page.getByLabel("Nova lozinka").fill(newPassword);
  await page.getByLabel("Potvrdite lozinku").fill(newPassword);
  await page.getByRole("button", { name: "Spremi i prijavi se" }).click();

  await expect(page).toHaveURL(new RegExp(`${ROUTES.adminPosts}$`));
}
