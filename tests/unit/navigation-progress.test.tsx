import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NavigationProgress } from "#app/platform/view-transitions/navigation-progress";

let container: HTMLDivElement;
let root: Root;
let router: ReturnType<typeof createMemoryRouter>;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  router.dispose();
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("navigation progress", () => {
  it("skips quick and superseded navigations but shows a slow public navigation", async () => {
    const first = pendingLoader();
    const second = pendingLoader();
    renderProgress(first.promise, second.promise);

    let firstNavigation: Promise<void> | undefined;
    act(() => {
      firstNavigation = router.navigate("/objave");
    });
    advance(199);
    await act(async () => {
      await first.finish();
      await firstNavigation;
    });
    advance(200);
    expect(progress()).toBeNull();

    act(() => {
      void router.navigate("/pitanja-i-odgovori");
    });
    advance(199);
    await act(async () => router.navigate("/kontakt"));
    advance(200);
    expect(progress()).toBeNull();

    act(() => {
      void router.navigate("/pitanja-i-odgovori");
    });
    advance(200);
    expect(progress()?.getAttribute("aria-label")).toBe("Učitavanje stranice");
    await act(async () => second.finish());
    advance(140);
    expect(progress()).toBeNull();
  });

  it("keeps the bar visible for the minimum time after a load finishes", async () => {
    const load = pendingLoader();
    renderProgress(load.promise);
    act(() => {
      void router.navigate("/objave");
    });
    advance(199);
    expect(progress()).toBeNull();
    advance(1);
    expect(progress()?.getAttribute("aria-label")).toBe("Učitavanje stranice");
    advance(40);
    await act(async () => load.finish());
    advance(99);
    expect(progress()?.getAttribute("role")).toBe("progressbar");
    advance(1);
    expect(progress()).toBeNull();
  });

  it("keeps an already visible bar while another navigation is loading", async () => {
    const first = pendingLoader();
    const second = pendingLoader();
    renderProgress(first.promise, second.promise);
    act(() => {
      void router.navigate("/objave");
    });
    advance(200);
    expect(progress()?.getAttribute("aria-label")).toBe("Učitavanje stranice");
    await act(async () => first.finish());
    advance(70);
    act(() => {
      void router.navigate("/pitanja-i-odgovori");
    });
    advance(100);
    expect(progress()?.getAttribute("role")).toBe("progressbar");
    await act(async () => second.finish());
    advance(0);
    expect(progress()).toBeNull();
  });
});

function renderProgress(posts: Promise<null>, questions: Promise<null> = Promise.resolve(null)) {
  router = createMemoryRouter([
    {
      element: (
        <>
          <NavigationProgress />
          <Outlet />
        </>
      ),
      children: [
        { path: "/", element: <h1>Početna</h1> },
        { path: "/objave", loader: () => posts, element: <h1>Objave</h1> },
        { path: "/pitanja-i-odgovori", loader: () => questions, element: <h1>Pitanja</h1> },
        { path: "/kontakt", element: <h1>Kontakt</h1> },
      ],
    },
  ]);
  act(() => root.render(<RouterProvider router={router} />));
}

function pendingLoader() {
  let complete: VoidFunction = noop;
  const promise = new Promise<null>((resolve) => {
    complete = () => resolve(null);
  });
  return {
    promise,
    finish: () => {
      complete();
      return promise;
    },
  };
}

function advance(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

function progress() {
  return container.querySelector('[role="progressbar"]');
}

function noop() {
  return undefined;
}
