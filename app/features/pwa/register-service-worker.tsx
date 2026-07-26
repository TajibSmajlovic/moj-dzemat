import { useEffect } from "react";

import { PWA_SCOPE, PWA_SERVICE_WORKER_PATH } from "#app/features/pwa/pwa-config";

type ServiceWorkerContainerLike = {
  register: (scriptUrl: string, options: { scope: string }) => Promise<unknown>;
};

export type ServiceWorkerRegistrationRuntime = {
  isProduction: boolean;
  isPageLoaded: boolean;
  serviceWorker?: ServiceWorkerContainerLike;
  addLoadListener: (listener: () => void) => void;
  removeLoadListener: (listener: () => void) => void;
};

export function scheduleServiceWorkerRegistration({
  isProduction,
  isPageLoaded,
  serviceWorker,
  addLoadListener,
  removeLoadListener,
}: ServiceWorkerRegistrationRuntime): () => void {
  if (!isProduction || !serviceWorker) return () => undefined;

  let disposed = false;
  let registrationStarted = false;

  const register = () => {
    if (disposed || registrationStarted) return;
    registrationStarted = true;

    try {
      void serviceWorker
        .register(PWA_SERVICE_WORKER_PATH, { scope: PWA_SCOPE })
        .catch(() => undefined);
    } catch {
      // Registration is optional enhancement behavior and must never affect
      // the successfully rendered online application.
    }
  };

  if (isPageLoaded) {
    register();
  } else {
    addLoadListener(register);
  }

  return () => {
    disposed = true;
    removeLoadListener(register);
  };
}

export function ServiceWorkerRegistration() {
  useEffect(
    () =>
      scheduleServiceWorkerRegistration({
        isProduction: import.meta.env.PROD,
        isPageLoaded: document.readyState === "complete",
        serviceWorker: "serviceWorker" in navigator ? navigator.serviceWorker : undefined,
        addLoadListener: (listener) => {
          globalThis.addEventListener("load", listener, { once: true });
        },
        removeLoadListener: (listener) => {
          globalThis.removeEventListener("load", listener);
        },
      }),
    [],
  );

  return null;
}
