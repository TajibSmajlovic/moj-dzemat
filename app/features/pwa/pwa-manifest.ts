import { PRODUCT_NAME, SITE_DESCRIPTION, SITE_NAME } from "#app/lib/branding";

import {
  PWA_BACKGROUND_COLOR,
  PWA_ICON_PATHS,
  PWA_MANIFEST_ID,
  PWA_SCOPE,
  PWA_START_URL,
  PWA_THEME_COLOR,
} from "./pwa-config";

type PwaManifestIcon = {
  src: string;
  sizes: string;
  type: "image/png";
  purpose: "any" | "maskable";
};

export type PwaManifest = {
  id: typeof PWA_MANIFEST_ID;
  name: string;
  short_name: typeof PRODUCT_NAME;
  description: string;
  lang: "bs-BA";
  start_url: typeof PWA_START_URL;
  scope: typeof PWA_SCOPE;
  display: "standalone";
  theme_color: typeof PWA_THEME_COLOR;
  background_color: typeof PWA_BACKGROUND_COLOR;
  icons: PwaManifestIcon[];
};

export const PWA_MANIFEST: PwaManifest = {
  id: PWA_MANIFEST_ID,
  name: SITE_NAME,
  short_name: PRODUCT_NAME,
  description: SITE_DESCRIPTION,
  lang: "bs-BA",
  start_url: PWA_START_URL,
  scope: PWA_SCOPE,
  display: "standalone",
  theme_color: PWA_THEME_COLOR,
  background_color: PWA_BACKGROUND_COLOR,
  icons: [
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
  ],
};
