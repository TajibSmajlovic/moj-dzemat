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
const offlineShellUrl = new URL(PWA_OFFLINE_SHELL_PATH, serviceWorker.location.origin).href;
const WEB_PUSH_PROTOCOL_VERSION = 1;
const MAX_PUSH_PAYLOAD_BYTES = 4096;

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

serviceWorker.addEventListener("message", (event: ExtendableMessageEvent) => {
  const message =
    event.data && typeof event.data === "object" ? (event.data as Record<string, unknown>) : null;

  if (message?.type === "WEB_PUSH_CAPABILITIES" && message.version === WEB_PUSH_PROTOCOL_VERSION) {
    event.ports[0]?.postMessage({ supported: true, version: WEB_PUSH_PROTOCOL_VERSION });
  }
});

serviceWorker.addEventListener("push", (event: PushEvent) => {
  event.waitUntil(showPushNotification(event));
});

serviceWorker.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(openPushTarget(event.notification.data));
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

type WebPushPayload = {
  v: 1;
  title: string;
  body: string;
  url: string;
  tag: string;
};

async function showPushNotification(event: PushEvent): Promise<void> {
  if (!event.data) return;

  const raw = event.data.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_PUSH_PAYLOAD_BYTES) return;

  const payload = parsePushPayload(raw);
  if (!payload) return;

  await serviceWorker.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/logo.png?v=1",
    badge: "/favicon-32x32.png?v=1",
    tag: payload.tag,
    data: { url: payload.url },
  });
}

function isSafePushPath(value: string): boolean {
  if (!value.startsWith("/objave/") || value.startsWith("//")) return false;

  try {
    const url = new URL(value, serviceWorker.location.origin);

    return url.origin === serviceWorker.location.origin && `${url.pathname}${url.search}` === value;
  } catch {
    return false;
  }
}

function parsePushPayload(raw: string): WebPushPayload | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    if (!("v" in value) || value.v !== WEB_PUSH_PROTOCOL_VERSION) return null;
    if (!("title" in value) || !isPushText(value.title, 160)) return null;
    if (!("body" in value) || !isPushText(value.body, 240)) return null;
    if (!("tag" in value) || !isPushText(value.tag, 80)) return null;
    if (!("url" in value) || typeof value.url !== "string") return null;
    if (!isSafePushPath(value.url)) return null;

    return { v: value.v, title: value.title, body: value.body, tag: value.tag, url: value.url };
  } catch {
    return null;
  }
}

function isPushText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

async function openPushTarget(data: unknown): Promise<void> {
  const url =
    data && typeof data === "object" && isSafePushPath((data as { url?: string }).url ?? "")
      ? new URL((data as { url: string }).url, serviceWorker.location.origin).href
      : new URL("/objave", serviceWorker.location.origin).href;
  const windowClients = await serviceWorker.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const target = windowClients.find((client): client is WindowClient => "focus" in client);

  if (target) {
    await target.navigate(url);
    await target.focus();
    return;
  }

  await serviceWorker.clients.openWindow(url);
}
