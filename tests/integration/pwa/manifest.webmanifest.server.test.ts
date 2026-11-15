import { describe, expect, it } from "vitest";

import { PWA_ICON_PATHS } from "#app/features/pwa/pwa-config";
import type { PwaManifest } from "#app/features/pwa/pwa-manifest";
import { SITE_NAME } from "#app/lib/branding";
import { loader } from "#app/routes/manifest[.]webmanifest";

describe("web app manifest route", () => {
  it("returns the configured manifest with revalidation headers", async () => {
    const response = loader();
    const manifest = (await response.json()) as PwaManifest;

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/manifest+json; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
    expect(manifest.name).toBe(SITE_NAME);
    expect(manifest.icons.map((icon) => icon.src)).toEqual([
      PWA_ICON_PATHS.standard192,
      PWA_ICON_PATHS.standard512,
      PWA_ICON_PATHS.maskable512,
    ]);
  });
});
