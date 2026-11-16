import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "mdz:web-push:v1";
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const WORKER_PROTOCOL_VERSION = 1;

export type WebPushState =
  | "initializing"
  | "hidden"
  | "ready"
  | "enabled"
  | "paused"
  | "enable-failed"
  | "retry"
  | "denied"
  | "unsupported"
  | "install-required"
  | "enabling"
  | "synchronizing"
  | "disabling";

type WebPushConfig = { enabled: boolean; vapidPublicKey?: string };
type StoredSyncState = {
  v: 1;
  currentHash?: string;
  syncedAt?: number;
  cleanupHash?: string;
};

type WebPushContextValue = {
  state: WebPushState;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  retry: () => Promise<void>;
};

const WebPushContext = createContext<WebPushContextValue | null>(null);

export function WebPushProvider({
  config,
  children,
}: {
  config: WebPushConfig;
  children: ReactNode;
}) {
  const [state, setState] = useState<WebPushState>("initializing");

  const inspect = useCallback(
    (forceSync = false) => inspectPush(config.enabled, setState, forceSync),
    [config.enabled],
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      void inspect().catch(() => {
        if (active) setState(config.enabled ? "retry" : "hidden");
      });
    });
    return () => {
      active = false;
    };
  }, [config.enabled, inspect]);

  const enable = useCallback(
    () => enablePush({ enabled: config.enabled, vapidPublicKey: config.vapidPublicKey }, setState),
    [config.enabled, config.vapidPublicKey],
  );
  const disable = useCallback(() => disablePush(config.enabled, setState), [config.enabled]);

  const retry = useCallback(async () => inspect(true), [inspect]);
  const value = useMemo(() => ({ state, enable, disable, retry }), [state, enable, disable, retry]);

  return <WebPushContext value={value}>{children}</WebPushContext>;
}

export function useWebPush(): WebPushContextValue {
  const value = use(WebPushContext);
  if (!value) throw new Error("useWebPush must be used inside WebPushProvider");
  return value;
}

type SetPushState = (state: WebPushState) => void;

async function inspectPush(
  enabled: boolean,
  setState: SetPushState,
  forceSync: boolean,
): Promise<void> {
  const initial = initialPushState(enabled);
  if (initial) {
    setState(initial);
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (Notification.permission === "denied") {
    if (subscription) await removeRevokedSubscription(subscription);
    setState(enabled ? "denied" : "hidden");
    return;
  }
  if (!enabled) {
    setState(subscription ? "paused" : "hidden");
    return;
  }
  if (!(await activeWorkerSupportsPush(registration))) {
    setState("unsupported");
    return;
  }
  if (!subscription) {
    await retryPendingCleanup();
    setState("ready");
    return;
  }

  await inspectActiveSubscription(registration, subscription, setState, forceSync);
}

function initialPushState(enabled: boolean): WebPushState | null {
  if (needsInstallation(enabled)) return "install-required";
  if (!isBrowserCapable()) return enabled ? "unsupported" : "hidden";
  return null;
}

function needsInstallation(enabled: boolean): boolean {
  if (!enabled || globalThis.window === undefined) return false;
  return isIosOrIpadOs() && !isStandaloneWebApp();
}

async function inspectActiveSubscription(
  registration: ServiceWorkerRegistration,
  subscription: PushSubscription,
  setState: SetPushState,
  forceSync: boolean,
): Promise<void> {
  const hash = await endpointHash(subscription.endpoint);
  const stored = readStoredState();
  if (stored.cleanupHash === hash) {
    setState("disabling");
    const disabled = await finishPendingOptOut(registration, subscription, hash);
    setState(stateAfterOptOut(true, disabled));
    return;
  }
  const synchronizationDue = isSyncDue(stored, hash, forceSync);
  if (!synchronizationDue) {
    await retryPendingCleanup();
    setState("enabled");
    return;
  }

  setState("synchronizing");
  try {
    await synchronizeSubscription(subscription, hash);
    setState("enabled");
  } catch {
    setState("retry");
  }
}

function isSyncDue(stored: StoredSyncState, hash: string, forceSync: boolean): boolean {
  return (
    forceSync ||
    stored.currentHash !== hash ||
    !stored.syncedAt ||
    Date.now() - stored.syncedAt >= SYNC_INTERVAL_MS
  );
}

async function enablePush(config: WebPushConfig, setState: SetPushState): Promise<void> {
  if (!config.enabled || !config.vapidPublicKey) return;
  if (!isBrowserCapable()) return;
  setState("enabling");
  try {
    const permission = await requestPermission();
    if (permission === "denied") {
      setState("denied");
      return;
    }
    if (permission !== "granted") {
      setState("ready");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    if (!(await activeWorkerSupportsPush(registration))) {
      setState("unsupported");
      return;
    }
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlBytes(config.vapidPublicKey),
      }));
    const hash = await endpointHash(subscription.endpoint);
    setState("synchronizing");
    await synchronizeSubscription(subscription, hash);
    setState("enabled");
  } catch {
    setState(await enableFailureState());
  }
}

async function requestPermission(): Promise<NotificationPermission> {
  return Notification.permission === "default"
    ? Notification.requestPermission()
    : Notification.permission;
}

async function enableFailureState(): Promise<WebPushState> {
  const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
  const subscription = await registration?.pushManager.getSubscription().catch(() => null);
  if (Notification.permission === "denied") {
    return "denied";
  }
  return subscription ? "retry" : "enable-failed";
}

async function disablePush(enabled: boolean, setState: SetPushState): Promise<void> {
  if (!isBrowserCapable()) return;
  setState("disabling");
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    const stored = readStoredState();
    const hash = subscription ? await endpointHash(subscription.endpoint) : stored.currentHash;
    if (!hash) {
      clearStoredState();
      setState(enabled ? "ready" : "hidden");
      return;
    }

    let disabled = true;
    if (subscription) {
      disabled = await finishPendingOptOut(registration, subscription, hash);
    } else {
      await finishServerCleanup(hash);
    }
    setState(stateAfterOptOut(enabled, disabled));
  } catch {
    setState(enabled ? "enabled" : "paused");
  }
}

function stateAfterOptOut(enabled: boolean, disabled: boolean): WebPushState {
  if (disabled) return enabled ? "ready" : "hidden";
  return enabled ? "enabled" : "paused";
}

function isBrowserCapable(): boolean {
  return (
    globalThis.window !== undefined &&
    "serviceWorker" in navigator &&
    "PushManager" in globalThis &&
    "Notification" in globalThis
  );
}

function isIosOrIpadOs(): boolean {
  const navigatorWithTouch = navigator as Navigator & { maxTouchPoints?: number };
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigatorWithTouch.maxTouchPoints ?? 0) > 1)
  );
}

function isStandaloneWebApp(): boolean {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return iosNavigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
}

async function activeWorkerSupportsPush(registration: ServiceWorkerRegistration): Promise<boolean> {
  const worker = registration.active ?? navigator.serviceWorker.controller;
  if (!worker) return false;

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => resolve(false), 1500);
    channel.port1.addEventListener("message", (event: MessageEvent<unknown>) => {
      clearTimeout(timeout);
      const message =
        event.data && typeof event.data === "object"
          ? (event.data as Record<string, unknown>)
          : null;
      resolve(message?.supported === true && message.version === WORKER_PROTOCOL_VERSION);
    });
    channel.port1.start();
    worker.postMessage({ type: "WEB_PUSH_CAPABILITIES", version: WORKER_PROTOCOL_VERSION }, [
      channel.port2,
    ]);
  });
}

function base64UrlBytes(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob((value + padding).replaceAll("-", "+").replaceAll("_", "/"));
  const output = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1)
    output[index] = binary.codePointAt(index) ?? 0;
  return output;
}

async function endpointHash(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  const binary = String.fromCodePoint(...new Uint8Array(digest));
  return `v1:${btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")}`;
}

async function synchronizeSubscription(
  subscription: PushSubscription,
  hash: string,
): Promise<void> {
  await retryPendingCleanup();
  const previous = readStoredState();
  const response = await fetch("/resources/web-push/subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (response.status !== 204) throw new Error("Subscription synchronization failed");

  writeStoredState({
    v: 1,
    currentHash: hash,
    syncedAt: Date.now(),
    ...(previous.cleanupHash &&
      previous.cleanupHash !== hash && { cleanupHash: previous.cleanupHash }),
  });
  const obsoleteHash = previous.currentHash === hash ? previous.cleanupHash : previous.currentHash;
  if (obsoleteHash && obsoleteHash !== hash) {
    try {
      await deleteServerSubscription(obsoleteHash);
      writeStoredState({ v: 1, currentHash: hash, syncedAt: Date.now() });
    } catch {
      writeStoredState({
        v: 1,
        currentHash: hash,
        syncedAt: Date.now(),
        cleanupHash: obsoleteHash,
      });
    }
  }
}

async function removeRevokedSubscription(subscription: PushSubscription): Promise<void> {
  const hash = await endpointHash(subscription.endpoint);
  writeStoredState({ v: 1, cleanupHash: hash });
  await subscription.unsubscribe().catch(() => false);
  try {
    await deleteServerSubscription(hash);
    clearStoredState();
  } catch {
    // The versioned one-way hash is retained for the next cleanup attempt.
  }
}

async function finishPendingOptOut(
  registration: ServiceWorkerRegistration,
  subscription: PushSubscription,
  hash: string,
): Promise<boolean> {
  writeStoredState({ v: 1, cleanupHash: hash });
  await subscription.unsubscribe().catch(() => false);

  const remainingSubscription = await registration.pushManager
    .getSubscription()
    .catch(() => subscription);
  const removedLocally = remainingSubscription === null;
  const removedFromServer = await finishServerCleanup(hash, removedLocally);

  return removedLocally || removedFromServer;
}

async function finishServerCleanup(hash: string, removedLocally = true): Promise<boolean> {
  writeStoredState({ v: 1, cleanupHash: hash });
  try {
    await deleteServerSubscription(hash);
    if (removedLocally) clearStoredState();
    return true;
  } catch {
    return false;
  }
}

async function retryPendingCleanup(): Promise<void> {
  const stored = readStoredState();
  if (!stored.cleanupHash || stored.cleanupHash === stored.currentHash) return;
  try {
    await deleteServerSubscription(stored.cleanupHash);
    writeStoredState({
      v: 1,
      ...(stored.currentHash && { currentHash: stored.currentHash }),
      ...(stored.syncedAt && { syncedAt: stored.syncedAt }),
    });
  } catch {
    // Cleanup is best-effort and retries on a later visit.
  }
}

async function deleteServerSubscription(hash: string): Promise<void> {
  const response = await fetch("/resources/web-push/subscription", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpointHash: hash }),
  });
  if (response.status !== 204) throw new Error("Subscription cleanup failed");
}

function readStoredState(): StoredSyncState {
  try {
    const value = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Partial<StoredSyncState> | null;
    if (value?.v !== 1) return { v: 1 };
    return {
      v: 1,
      ...(isEndpointHash(value.currentHash) && { currentHash: value.currentHash }),
      ...(typeof value.syncedAt === "number" && { syncedAt: value.syncedAt }),
      ...(isEndpointHash(value.cleanupHash) && { cleanupHash: value.cleanupHash }),
    };
  } catch {
    return { v: 1 };
  }
}

function writeStoredState(value: StoredSyncState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function clearStoredState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function isEndpointHash(value: unknown): value is string {
  return typeof value === "string" && /^v1:[A-Za-z0-9_-]{43}$/.test(value);
}
