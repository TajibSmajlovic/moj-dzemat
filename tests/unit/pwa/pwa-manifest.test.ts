import { describe, expect, it } from "vitest";

import {
  PWA_BACKGROUND_COLOR,
  PWA_ICON_PATHS,
  PWA_MANIFEST_ID,
  PWA_SCOPE,
  PWA_START_URL,
  PWA_THEME_COLOR,
} from "#app/features/pwa/pwa-config";
import { PWA_MANIFEST } from "#app/features/pwa/pwa-manifest";
import { dzemat } from "#app/lib/branding";

describe("PWA_MANIFEST", () => {
  it("names the configured džemat while keeping the stable install identity", () => {
    expect(PWA_MANIFEST).toMatchObject({
      id: PWA_MANIFEST_ID,
      name: `Moj Džemat - ${dzemat.name}`,
      short_name: "Moj Džemat",
      lang: "bs-BA",
      start_url: PWA_START_URL,
      scope: PWA_SCOPE,
      display: "standalone",
      theme_color: PWA_THEME_COLOR,
      background_color: PWA_BACKGROUND_COLOR,
    });
    expect(PWA_MANIFEST.description).toContain(`džemata ${dzemat.name}`);
  });

  it("declares standard and maskable PNG icons", () => {
    expect(PWA_MANIFEST.icons).toEqual([
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
