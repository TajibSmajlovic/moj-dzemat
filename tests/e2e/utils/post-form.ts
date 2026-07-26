import type { Page } from "@playwright/test";

import { TINY_PNG_BASE64 } from "../../helpers/png";

type PostType = "obavijest" | "hutba" | "sergija" | "smrtovnica" | "price";

type FillPostFormOptions = {
  title?: string;
  slug?: string;
  type?: PostType;
  body?: string;
  /** Whether to tick "Objavi odmah". Defaults to false (draft). */
  publish?: boolean;
};

/**
 * Fills the post create/edit form. Every field is optional so the same
 * helper covers both flows: a create test passes everything, an edit
 * test typically passes only the fields it's mutating, and the slug-
 * conflict test passes everything but `publish`. Playwright auto-waits
 * for the inputs to be actionable, so the explicit `waitFor` on the
 * rich editor is just clarity for readers.
 */
export async function fillPostForm(page: Page, options: FillPostFormOptions) {
  if (options.title !== undefined) {
    await page.getByRole("textbox", { name: "Naslov" }).fill(options.title);
  }
  if (options.slug !== undefined) {
    await page.getByLabel("Dio URL-a").fill(options.slug);
  }
  if (options.type !== undefined) {
    await page.getByLabel("Vrsta").selectOption(options.type);
  }
  if (options.body !== undefined) {
    await page.locator(".ProseMirror").waitFor({ state: "visible" });
    await page.locator(".ProseMirror").fill(options.body);
  }
  if (options.publish === true) {
    await page.getByLabel("Objavi odmah").click();
  }
}

export async function uploadTinyPng(
  page: Page,
  { filename = "e2e-image.png" }: { filename?: string } = {},
) {
  await page.locator('input[type="file"][name="images"]').setInputFiles({
    name: filename,
    mimeType: "image/png",
    buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
  });
}
