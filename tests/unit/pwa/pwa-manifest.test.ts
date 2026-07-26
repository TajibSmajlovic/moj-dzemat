import { describe, expect, it } from "vitest";

import {
  PWA_BACKGROUND_COLOR,
  PWA_ICON_PATHS,
  PWA_MANIFEST_ID,
  PWA_SCOPE,
  PWA_START_URL,
  PWA_THEME_COLOR,
} from "#app/features/pwa/pwa-config";
import { buildPwaManifest } from "#app/features/pwa/pwa-manifest";
import { DEFAULT_SITE_NAME, formatSiteDescription } from "#app/lib/branding";

describe("buildPwaManifest", () => {
  it("builds the default stable application identity", () => {
    const manifest = buildPwaManifest();

    expect(manifest).toMatchObject({
      id: PWA_MANIFEST_ID,
      name: DEFAULT_SITE_NAME,
      short_name: DEFAULT_SITE_NAME,
      description: formatSiteDescription(DEFAULT_SITE_NAME),
      lang: "bs-BA",
      start_url: PWA_START_URL,
      scope: PWA_SCOPE,
      display: "standalone",
      theme_color: PWA_THEME_COLOR,
      background_color: PWA_BACKGROUND_COLOR,
    });
  });

  it("uses configured branding without changing the stable short name or identity", () => {
    const manifest = buildPwaManifest("  Donje Mostre  ");

    expect(manifest.name).toBe("Moj Džemat - Donje Mostre");
    expect(manifest.description).toContain("džemata Donje Mostre");
    expect(manifest.short_name).toBe(DEFAULT_SITE_NAME);
    expect(manifest.id).toBe(PWA_MANIFEST_ID);
    expect(manifest.start_url).toBe(PWA_START_URL);
    expect(manifest.scope).toBe(PWA_SCOPE);
  });

  it("declares standard and maskable PNG icons", () => {
    expect(buildPwaManifest().icons).toEqual([
      {
        src: PWA_ICON_PATHS.standard192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: PWA_ICON_PATHS.standard512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: PWA_ICON_PATHS.maskable512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ]);
  });
});
