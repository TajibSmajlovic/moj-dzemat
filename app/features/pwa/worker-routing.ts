import {
  PWA_CACHE_PREFIX,
  PWA_OFFLINE_SHELL_PATH,
  PWA_SERVICE_WORKER_PATH,
  PWA_SHELL_CACHE_PREFIX,
} from "./pwa-config";

type WorkerRequest = {
  method: string;
  mode: string;
  url: string;
  headers: Pick<Headers, "has">;
};

const STATIC_FILE_EXTENSION_RE =
  /\.(?:css|gif|ico|jpe?g|js|json|map|mjs|png|svg|txt|webmanifest|webp|woff2?|xml)$/i;
const RESOURCE_PATH_PREFIXES = ["/.well-known/", "/assets/", "/resources/", "/slike/"];
const REVISION_RE = /^[a-f0-9]{64}$/;

export function shouldHandleNavigationRequest(
  request: WorkerRequest,
  serviceWorkerOrigin: string,
): boolean {
  if (request.method !== "GET" || request.mode !== "navigate" || request.headers.has("range")) {
    return false;
  }

  let url: URL;

  try {
    url = new URL(request.url);
  } catch {
    return false;
  }

  if (url.origin !== serviceWorkerOrigin) return false;

  return !isResourcePath(url.pathname);
}

export function getPwaShellCacheName(offlineShellRevision: string): string {
  if (!REVISION_RE.test(offlineShellRevision)) {
    throw new Error("The offline shell revision must be a SHA-256 hex digest.");
  }

  return `${PWA_SHELL_CACHE_PREFIX}${offlineShellRevision}`;
}

export function selectObsoletePwaCacheNames(
  cacheNames: readonly string[],
  currentCacheName: string,
): string[] {
  return selectPwaOwnedCacheNames(cacheNames).filter((cacheName) => cacheName !== currentCacheName);
}

export function selectPwaOwnedCacheNames(cacheNames: readonly string[]): string[] {
  return cacheNames.filter((cacheName) => cacheName.startsWith(PWA_CACHE_PREFIX));
}

function isResourcePath(pathname: string): boolean {
  if (pathname === PWA_SERVICE_WORKER_PATH || pathname === PWA_OFFLINE_SHELL_PATH) return true;
  if (pathname.endsWith(".data") || STATIC_FILE_EXTENSION_RE.test(pathname)) return true;

  return RESOURCE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
