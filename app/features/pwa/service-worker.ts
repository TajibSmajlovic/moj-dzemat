/// <reference lib="webworker" />

import { PWA_OFFLINE_SHELL_PATH } from "./pwa-config";
import {
  getPwaShellCacheName,
  selectObsoletePwaCacheNames,
  shouldHandleNavigationRequest,
} from "./worker-routing";

declare const __PWA_OFFLINE_SHELL_REVISION__: string;

const serviceWorker = globalThis as unknown as ServiceWorkerGlobalScope;
const shellCacheName = getPwaShellCacheName(__PWA_OFFLINE_SHELL_REVISION__);
const offlineShellUrl = new URL(PWA_OFFLINE_SHELL_PATH, serviceWorker.location.origin).toString();

serviceWorker.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(cacheOfflineShell());
});

serviceWorker.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(activateServiceWorker());
});

serviceWorker.addEventListener("fetch", (event: FetchEvent) => {
  if (!shouldHandleNavigationRequest(event.request, serviceWorker.location.origin)) return;

  event.respondWith(handleNavigation(event));
});

async function cacheOfflineShell(): Promise<void> {
  const response = await fetch(
    new Request(offlineShellUrl, {
      cache: "reload",
    }),
  );

  if (!response.ok) {
    throw new Error(`The offline shell request failed with status ${String(response.status)}.`);
  }

  const cache = await caches.open(shellCacheName);
  await cache.put(offlineShellUrl, response);
}

async function activateServiceWorker(): Promise<void> {
  await Promise.all([enableNavigationPreload(), deleteObsoletePwaCaches()]);
  await serviceWorker.clients.claim();
}

async function enableNavigationPreload(): Promise<void> {
  if (serviceWorker.registration.navigationPreload) {
    await serviceWorker.registration.navigationPreload.enable();
  }
}

async function deleteObsoletePwaCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  const obsoleteCacheNames = selectObsoletePwaCacheNames(cacheNames, shellCacheName);

  await Promise.all(obsoleteCacheNames.map((cacheName) => caches.delete(cacheName)));
}

async function handleNavigation(event: FetchEvent): Promise<Response> {
  try {
    const preloadResponse = (await event.preloadResponse) as Response | undefined;
    if (preloadResponse) return preloadResponse;

    return await fetch(event.request);
  } catch {
    const cache = await caches.open(shellCacheName);

    return (await cache.match(offlineShellUrl)) ?? Response.error();
  }
}
