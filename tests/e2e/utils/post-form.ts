import { expect, type Page } from "@playwright/test";

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
 * conflict test passes everything but `publish`.
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
    // The rich editor is client-only, so it does not exist until the route
    // has hydrated and Tiptap has booted.
    const editor = page.locator(".ProseMirror");
    await editor.waitFor({ state: "visible" });
    await editor.fill(options.body);

    // The editor is not the field that gets submitted. Its content reaches
    // the form through React state and a hidden input, so wait for that hop
    // before the caller clicks save on a stale value.
    await expect
      .poll(() => page.locator('input[type="hidden"][name="body"]').inputValue())
      .toContain(options.body);
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
