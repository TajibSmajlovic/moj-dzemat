import { describe, expect, it, vi } from "vitest";

import { PWA_SCOPE, PWA_SERVICE_WORKER_PATH } from "#app/features/pwa/pwa-config";
import {
  scheduleServiceWorkerRegistration,
  type ServiceWorkerRegistrationRuntime,
} from "#app/features/pwa/register-service-worker";

function runtime(
  overrides: Partial<ServiceWorkerRegistrationRuntime> = {},
): ServiceWorkerRegistrationRuntime & {
  listener: { current?: () => void };
  register: ReturnType<typeof vi.fn>;
} {
  const listener: { current?: () => void } = {};
  const register = vi.fn().mockResolvedValue({});

  return {
    isProduction: true,
    isPageLoaded: false,
    serviceWorker: { register },
    addLoadListener: (nextListener) => {
      listener.current = nextListener;
    },
    removeLoadListener: (nextListener) => {
      if (listener.current === nextListener) listener.current = undefined;
    },
    listener,
    register,
    ...overrides,
  };
}

describe("service worker registration", () => {
  it("does nothing outside production or when the API is unavailable", () => {
    const development = runtime({ isProduction: false });
    const unsupported = runtime({ serviceWorker: undefined });

    scheduleServiceWorkerRegistration(development);
    scheduleServiceWorkerRegistration(unsupported);

    expect(development.listener.current).toBeUndefined();
    expect(development.register).not.toHaveBeenCalled();
    expect(unsupported.listener.current).toBeUndefined();
  });

  it("waits for page load and registers the stable root-scoped worker once", () => {
    const registrationRuntime = runtime();

    scheduleServiceWorkerRegistration(registrationRuntime);
    expect(registrationRuntime.register).not.toHaveBeenCalled();

    registrationRuntime.listener.current?.();
    registrationRuntime.listener.current?.();

    expect(registrationRuntime.register).toHaveBeenCalledOnce();
    expect(registrationRuntime.register).toHaveBeenCalledWith(PWA_SERVICE_WORKER_PATH, {
      scope: PWA_SCOPE,
    });
  });

  it("registers immediately when mounted after page load and swallows failures", async () => {
    const registrationRuntime = runtime({ isPageLoaded: true });
    registrationRuntime.register.mockRejectedValue(new Error("Registration denied"));

    scheduleServiceWorkerRegistration(registrationRuntime);

    expect(registrationRuntime.register).toHaveBeenCalledOnce();
    await expect(Promise.resolve()).resolves.toBeUndefined();
  });

  it("swallows synchronous registration errors", () => {
    const registrationRuntime = runtime({ isPageLoaded: true });
    registrationRuntime.register.mockImplementation(() => {
      throw new Error("Invalid registration state");
    });

    expect(() => scheduleServiceWorkerRegistration(registrationRuntime)).not.toThrow();
  });

  it("cancels a pending registration when unmounted before page load", () => {
    const registrationRuntime = runtime();
    const dispose = scheduleServiceWorkerRegistration(registrationRuntime);

    const loadListener = registrationRuntime.listener.current;
    dispose();
    loadListener?.();

    expect(registrationRuntime.register).not.toHaveBeenCalled();
    expect(registrationRuntime.listener.current).toBeUndefined();
  });
});
