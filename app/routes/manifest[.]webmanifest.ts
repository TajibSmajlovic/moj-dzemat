import { PWA_MANIFEST } from "#app/features/pwa/pwa-manifest";

export function loader() {
  return Response.json(PWA_MANIFEST, {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
