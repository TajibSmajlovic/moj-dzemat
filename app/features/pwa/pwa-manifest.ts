import { DEFAULT_SITE_NAME, formatSiteDescription, formatSiteName } from "#app/lib/branding";

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
  short_name: typeof DEFAULT_SITE_NAME;
  description: string;
  lang: "bs-BA";
  start_url: typeof PWA_START_URL;
  scope: typeof PWA_SCOPE;
  display: "standalone";
  theme_color: typeof PWA_THEME_COLOR;
  background_color: typeof PWA_BACKGROUND_COLOR;
  icons: PwaManifestIcon[];
};

export function buildPwaManifest(dzematName?: string): PwaManifest {
  const name = formatSiteName(dzematName);

  return {
    id: PWA_MANIFEST_ID,
    name,
    short_name: DEFAULT_SITE_NAME,
    description: formatSiteDescription(name),
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
}
