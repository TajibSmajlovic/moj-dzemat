import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test("serves the catalogue and preserves main-site framing protection", async ({
  page,
  request,
}) => {
  const redirect = await request.get("/storybook?path=/story/ui-button--default", {
    maxRedirects: 0,
  });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toBe("/storybook/?path=/story/ui-button--default");
  const catalogue = await request.get("/storybook/");
  expect(catalogue.ok()).toBe(true);
  expect(catalogue.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(catalogue.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(catalogue.headers()["x-robots-tag"]).toContain("noindex");
  expect(catalogue.headers()["cache-control"]).toBe("no-cache");
  const app = await request.get("/prijava");
  expect(app.headers()["x-frame-options"]).toBe("DENY");
  expect(app.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  const head = await request.head("/storybook/iframe.html");
  expect(head.status()).toBe(200);
  const post = await request.post("/storybook/");
  expect(post.status()).toBe(405);
  const missing = await request.get("/storybook/assets/missing.js");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["content-type"]).toContain("text/plain");
  const index = await request.get("/storybook/index.json");
  expect(index.headers()["cache-control"]).toBe("no-cache");
  const assets = fs.readdirSync(path.resolve("build/storybook/assets"));
  for (const [extension, mime] of [
    ["js", "javascript"],
    ["css", "text/css"],
    ["woff2", "font/woff2"],
    ["svg", "image/svg+xml"],
  ]) {
    const file = assets.find((name) => name.endsWith(`.${extension}`));
    expect(file).toBeTruthy();
    const asset = await request.get(`/storybook/assets/${file}`);
    expect(asset.ok()).toBe(true);
    expect(asset.headers()["content-type"]).toContain(mime);
    expect(asset.headers()["cache-control"]).toContain("immutable");
  }
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/storybook/?path=/story/ui-button--default");
  const preview = page.frameLocator("#storybook-preview-iframe");
  await expect(preview.getByRole("button", { name: "Sačuvaj" })).toBeVisible();
  await page.reload();
  await expect(preview.getByRole("button", { name: "Sačuvaj" })).toBeVisible();
  await page.goto("/storybook/?path=/docs/ui-button--docs");
  await expect(preview.getByRole("heading", { name: "Button", exact: true })).toBeVisible();
  await page.reload();
  await expect(preview.getByRole("heading", { name: "Button", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("loads stories under an existing app worker without changing app preferences", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(180_000);
  const index = await request.get("/storybook/index.json");
  const catalogue = (await index.json()) as {
    entries: Record<string, { id: string; type: string }>;
  };
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await page.evaluate(() => localStorage.setItem("moj-dzemat-theme", "light"));
  const cookiesBefore = await context.cookies();
  const storageBefore = await page.evaluate(() => ({ ...localStorage }));
  const failures: string[] = [];
  const forbidden: string[] = [];
  const origin = new URL(page.url()).origin;
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || !url.pathname.startsWith("/storybook/")) {
      forbidden.push(url.origin === origin ? url.pathname : url.origin);
      await route.abort();
      return;
    }
    await route.continue();
  });
  for (const { id, type } of Object.values(catalogue.entries)) {
    if (type !== "story") continue;
    await page.setViewportSize(
      id === "layout--mobile-header" ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    );
    await page.goto(`/storybook/iframe.html?id=${id}&viewMode=story`);
    await expect(page.locator("html")).toHaveAttribute("data-story-ready", id);
    await expect(page.locator(".sb-errordisplay")).not.toBeVisible();
  }
  await page.goto("/storybook/iframe.html?id=ui-disclosure--native-accordion&viewMode=story");
  await expect(page.locator("html")).toHaveAttribute(
    "data-story-ready",
    "ui-disclosure--native-accordion",
  );
  const summary = page.locator("summary").first();
  await summary.focus();
  const wasOpen = await summary.evaluate((node) => node.parentElement!.hasAttribute("open"));
  await page.keyboard.press("Enter");
  await expect(page.locator("details").first()).toHaveJSProperty("open", !wasOpen);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storageBefore);
  expect(await context.cookies()).toEqual(cookiesBefore);
  expect(forbidden).toEqual([]);
  expect(failures).toEqual([]);
});

test("keeps the catalogue usable while the app worker updates", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  // A new script URL installs a worker while the current page still holds the old one.
  await page.evaluate(() =>
    navigator.serviceWorker.register("/sw.js?storybook-update", { scope: "/" }),
  );
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration?.waiting?.scriptURL;
      }),
    )
    .toContain("storybook-update");
  await page.goto("/storybook/?path=/story/ui-button--default");
  await expect(
    page.frameLocator("#storybook-preview-iframe").getByRole("button", { name: "Sačuvaj" }),
  ).toBeVisible();
  const nextPage = await context.newPage();
  const replacement = context
    .serviceWorkers()
    .find((worker) => worker.url().includes("storybook-update"));
  expect(replacement).toBeTruthy();
  await page.close();
  await expect
    .poll(() => replacement!.evaluate<string>("self.registration.active?.scriptURL"))
    .toContain("storybook-update");
  await nextPage.goto("/storybook/iframe.html?id=ui-button--default&viewMode=story");
  await expect(nextPage.getByRole("button", { name: "Sačuvaj" })).toBeVisible();
  await expect
    .poll(() => nextPage.evaluate(() => navigator.serviceWorker.controller?.scriptURL))
    .toContain("storybook-update");
  await context.setOffline(true);
  await expect(
    nextPage.goto("/storybook/iframe.html?id=ui-button--default&offline=1"),
  ).rejects.toThrow();
  await context.setOffline(false);
});
