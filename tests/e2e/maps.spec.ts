import { expect, test } from "@playwright/test";

import { DZEMAT_LOCATION } from "../../app/lib/maps";

test("the embedded map can access its own child frames", async ({ page }) => {
  test.skip(!DZEMAT_LOCATION, "This deployment does not configure a map.");
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  // Model Maps' same-origin child frame access without depending on Google's network.
  await page.route("https://www.google.com/maps?**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><iframe title="Detalji mape" src="https://www.google.com/maps/test-child"></iframe>',
    }),
  );
  await page.route("https://www.google.com/maps/test-child", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><body><script>
        parent.addEventListener("message", () => {});
        document.body.textContent = "Mapa je spremna";
      </script>`,
    }),
  );

  await page.goto("/");
  const map = page.locator('iframe[title^="Google mapa za"]');
  await map.scrollIntoViewIfNeeded();
  const child = map.contentFrame().frameLocator('iframe[title="Detalji mape"]');
  await expect(child.getByText("Mapa je spremna")).toBeVisible();
  expect(errors).toEqual([]);
});
