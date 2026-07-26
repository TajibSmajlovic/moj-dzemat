/// <reference lib="webworker" />

import { PWA_DATABASE_NAME } from "./pwa-config";
import { performRecoveryCleanup } from "./recovery-cleanup";

const recoveryWorker = globalThis as unknown as ServiceWorkerGlobalScope;

recoveryWorker.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(recoveryWorker.skipWaiting());
});

recoveryWorker.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(cleanUpPwaBrowserState());
});

async function cleanUpPwaBrowserState(): Promise<void> {
  await performRecoveryCleanup({
    listCacheNames: () => caches.keys(),
    deleteCache: (cacheName) => caches.delete(cacheName),
    deleteDatabase: deletePwaDatabase,
    unregister: () => recoveryWorker.registration.unregister(),
  });
}

function deletePwaDatabase(): Promise<void> {
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.deleteDatabase(PWA_DATABASE_NAME);
    } catch {
      resolve();
      return;
    }

    request.addEventListener("success", () => resolve());
    request.addEventListener("error", () => resolve());
    request.addEventListener("blocked", () => resolve());
  });
}
