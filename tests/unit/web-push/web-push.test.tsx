import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WebPushProvider, useWebPush, type WebPushState } from "#app/features/web-push/web-push";

const STORAGE_KEY = "mdz:web-push:v1";

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let originalServiceWorkerDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  localStorage.clear();
  originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  container = null;
  if (originalServiceWorkerDescriptor) {
    Object.defineProperty(navigator, "serviceWorker", originalServiceWorkerDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "serviceWorker");
  }
  vi.unstubAllGlobals();
});

describe("Web Push browser opt-out", () => {
  it("does not synchronize a local subscription again after unsubscribe fails", async () => {
    const subscription = {
      endpoint: "https://push.example.com/send/device",
      unsubscribe: vi.fn().mockRejectedValue(new Error("browser push service unavailable")),
      toJSON: vi.fn(),
    } as unknown as PushSubscription;
    const getSubscription = vi.fn().mockResolvedValue(subscription);
    const registration = {
      active: {
        postMessage: (_message: unknown, ports: readonly FakeMessagePort[]) => {
          ports[0]?.postMessage({ supported: true, version: 1 });
        },
      },
      pushManager: { getSubscription },
    } as unknown as ServiceWorkerRegistration;
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("MessageChannel", FakeMessageChannel);
    vi.stubGlobal("PushManager", class PushManager {});
    vi.stubGlobal("Notification", {
      permission: "granted",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        getRegistration: vi.fn().mockResolvedValue(registration),
      },
    });

    const context = renderProvider();
    await vi.waitFor(() => expect(context.current?.state).toBe("enabled"));
    expect(methodCalls(fetchMock, "PUT")).toHaveLength(1);

    await act(async () => context.current?.disable());
    expect(context.current?.state).toBe("ready");
    expect(localStorage.getItem(STORAGE_KEY)).toMatch(/"cleanupHash":"v1:/);

    act(() => root?.unmount());
    root = null;
    const remountedContext = renderProvider();
    await vi.waitFor(() => expect(remountedContext.current?.state).toBe("ready"));

    expect(methodCalls(fetchMock, "PUT")).toHaveLength(1);
    expect(methodCalls(fetchMock, "DELETE")).toHaveLength(2);
  });
});

function renderProvider() {
  const context: { current: { state: WebPushState; disable: () => Promise<void> } | null } = {
    current: null,
  };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  function Probe() {
    const webPush = useWebPush();
    context.current = { state: webPush.state, disable: webPush.disable };
    return null;
  }

  act(() => {
    root?.render(
      <WebPushProvider config={{ enabled: true, vapidPublicKey: "test-public-key" }}>
        <Probe />
      </WebPushProvider>,
    );
  });

  return context;
}

function methodCalls(fetchMock: ReturnType<typeof vi.fn>, method: string) {
  return fetchMock.mock.calls.filter(
    ([, init]) => (init as RequestInit | undefined)?.method === method,
  );
}

class FakeMessagePort {
  peer?: FakeMessagePort;
  listener?: (event: MessageEvent<unknown>) => void;

  addEventListener(_type: "message", listener: (event: MessageEvent<unknown>) => void) {
    this.listener = listener;
  }

  start() {
    return undefined;
  }

  postMessage(data: unknown) {
    globalThis.queueMicrotask(() => this.peer?.listener?.({ data } as MessageEvent<unknown>));
  }
}

class FakeMessageChannel {
  readonly port1 = new FakeMessagePort();
  readonly port2 = new FakeMessagePort();

  constructor() {
    this.port1.peer = this.port2;
    this.port2.peer = this.port1;
  }
}
