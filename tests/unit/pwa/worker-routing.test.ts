import { describe, expect, it } from "vitest";

import { PWA_CACHE_PREFIX, PWA_SHELL_CACHE_PREFIX } from "#app/features/pwa/pwa-config";
import {
  getPwaShellCacheName,
  selectObsoletePwaCacheNames,
  selectPwaOwnedCacheNames,
  shouldHandleNavigationRequest,
} from "#app/features/pwa/worker-routing";

const ORIGIN = "https://dzemat.example";
const REVISION = "a".repeat(64);

function request(
  pathname: string,
  overrides: Partial<{
    method: string;
    mode: string;
    url: string;
    range: boolean;
  }> = {},
) {
  const range = overrides.range ?? false;

  return {
    method: overrides.method ?? "GET",
    mode: overrides.mode ?? "navigate",
    url: overrides.url ?? `${ORIGIN}${pathname}`,
    headers: {
      has: (name: string) => range && name.toLowerCase() === "range",
    },
  };
}

describe("service worker request routing", () => {
  it("handles same-origin document navigations, including private route shells", () => {
    expect(shouldHandleNavigationRequest(request("/"), ORIGIN)).toBe(true);
    expect(shouldHandleNavigationRequest(request("/objave/javna-objava"), ORIGIN)).toBe(true);
    expect(shouldHandleNavigationRequest(request("/admin/objave"), ORIGIN)).toBe(true);
    expect(shouldHandleNavigationRequest(request("/prijava"), ORIGIN)).toBe(true);
  });

  it("bypasses non-navigation, non-GET, cross-origin, range, and malformed requests", () => {
    expect(shouldHandleNavigationRequest(request("/", { method: "POST" }), ORIGIN)).toBe(false);
    expect(shouldHandleNavigationRequest(request("/", { mode: "cors" }), ORIGIN)).toBe(false);
    expect(shouldHandleNavigationRequest(request("/", { range: true }), ORIGIN)).toBe(false);
    expect(
      shouldHandleNavigationRequest(request("/", { url: "https://other.example/" }), ORIGIN),
    ).toBe(false);
    expect(shouldHandleNavigationRequest(request("/", { url: "not a url" }), ORIGIN)).toBe(false);
  });

  it("bypasses React Router data, resource, and static paths", () => {
    for (const pathname of [
      "/objave/javna-objava.data",
      "/resources/readiness",
      "/assets/root.js",
      "/slike/image-id",
      "/.well-known/appspecific/com.chrome.devtools.json",
      "/manifest.webmanifest",
      "/robots.txt",
      "/sitemap.xml",
      "/offline.html",
      "/sw.js",
    ]) {
      expect(shouldHandleNavigationRequest(request(pathname), ORIGIN), pathname).toBe(false);
    }
  });
});

describe("service worker cache ownership", () => {
  it("builds a revisioned PWA-owned shell cache name", () => {
    expect(getPwaShellCacheName(REVISION)).toBe(`${PWA_SHELL_CACHE_PREFIX}${REVISION}`);
    expect(() => getPwaShellCacheName("not-a-sha256")).toThrow("SHA-256");
  });

  it("selects only obsolete caches owned by this PWA", () => {
    const current = getPwaShellCacheName(REVISION);
    const obsolete = `${PWA_SHELL_CACHE_PREFIX}${"b".repeat(64)}`;

    expect(
      selectObsoletePwaCacheNames(
        [current, obsolete, `${PWA_CACHE_PREFIX}legacy`, "other-app-shell"],
        current,
      ),
    ).toEqual([obsolete, `${PWA_CACHE_PREFIX}legacy`]);
  });

  it("selects every PWA-owned cache for recovery cleanup", () => {
    expect(
      selectPwaOwnedCacheNames([
        `${PWA_SHELL_CACHE_PREFIX}${REVISION}`,
        `${PWA_CACHE_PREFIX}legacy`,
        "other-app-shell",
      ]),
    ).toEqual([`${PWA_SHELL_CACHE_PREFIX}${REVISION}`, `${PWA_CACHE_PREFIX}legacy`]);
  });
});
