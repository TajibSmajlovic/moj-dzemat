import { describe, expect, it } from "vitest";

import { pwaAssetHeaders } from "#app/features/pwa/pwa-assets.server";

describe("PWA production artifact headers", () => {
  it("serves the worker as revalidated JavaScript with root scope", () => {
    expect(pwaAssetHeaders("service-worker")).toEqual({
      "Cache-Control": "no-cache, must-revalidate",
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
    });
  });

  it("serves the offline shell as revalidated HTML", () => {
    expect(pwaAssetHeaders("offline-shell")).toEqual({
      "Cache-Control": "no-cache, must-revalidate",
      "Content-Type": "text/html; charset=utf-8",
    });
  });
});
