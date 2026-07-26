export const PWA_MANIFEST_PATH = "/manifest.webmanifest";
export const PWA_MANIFEST_ID = "/";
export const PWA_START_URL = "/";
export const PWA_SCOPE = "/";
export const PWA_SERVICE_WORKER_PATH = "/sw.js";
export const PWA_OFFLINE_SHELL_PATH = "/offline.html";

export const PWA_THEME_COLOR = "#1a7459";
export const PWA_BACKGROUND_COLOR = "#faf8f5";

export const PWA_ICON_PATHS = {
  standard192: "/pwa-icon-192.png",
  standard512: "/pwa-icon-512.png",
  maskable512: "/pwa-icon-maskable-512.png",
} as const;

export const PWA_DATABASE_NAME = "moj-dzemat-pwa";
export const PWA_DATABASE_VERSION = 1;
export const PWA_POST_SNAPSHOT_STORE = "post-snapshots";
export const PWA_POST_SNAPSHOT_LAST_VIEWED_INDEX = "by-last-viewed";
export const PWA_POST_SNAPSHOT_SCHEMA_VERSION = 1;
export const PWA_POST_SNAPSHOT_LIMIT = 20;

export const PWA_CACHE_PREFIX = "moj-dzemat-pwa-";
export const PWA_SHELL_CACHE_PREFIX = `${PWA_CACHE_PREFIX}shell-`;
