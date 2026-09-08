import { href } from "react-router";

import { expect, test } from "@playwright/test";

// The no-flash script follows the OS when nothing is stored. Pin light so
// the first assertion is not at the mercy of the runner's color scheme.
test.use({ colorScheme: "light" });

const DARK_HTML_CLASS = /<html\b[^>]*\sclass="dark"/;

test.describe("theme", () => {
  test("dark mode survives a reload through the server-read cookie", async ({ page }) => {
    await page.goto(href("/"));

    const documentElement = page.locator("html");
    await expect(documentElement).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "Uključi tamnu temu" }).click();

    const lightThemeButton = page.getByRole("button", { name: "Uključi svijetlu temu" });
    await expect(documentElement).toHaveClass(/dark/);
    await expect(lightThemeButton).toHaveAttribute("aria-pressed", "true");

    const reloaded = await page.reload();
    if (!reloaded) {
      throw new Error("Reload did not return a document response.");
    }

    // Served HTML, not the live DOM. The no-flash script would add `dark`
    // from localStorage on its own, so only the response proves the loader
    // read the cookie.
    expect(await reloaded.text()).toMatch(DARK_HTML_CLASS);

    await expect(documentElement).toHaveClass(/dark/);
    await expect(lightThemeButton).toHaveAttribute("aria-pressed", "true");
  });
});
