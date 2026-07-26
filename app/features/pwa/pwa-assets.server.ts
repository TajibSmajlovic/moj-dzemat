export type PwaAssetKind = "offline-shell" | "service-worker";

export function pwaAssetHeaders(kind: PwaAssetKind): Record<string, string> {
  return {
    "Cache-Control": "no-cache, must-revalidate",
    "Content-Type":
      kind === "service-worker"
        ? "application/javascript; charset=utf-8"
        : "text/html; charset=utf-8",
    ...(kind === "service-worker" ? { "Service-Worker-Allowed": "/" } : {}),
  };
}
