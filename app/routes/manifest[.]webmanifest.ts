import { buildPwaManifest } from "#app/features/pwa/pwa-manifest";
import { env } from "#app/server/env.server";

export function loader() {
  const manifest = buildPwaManifest(env().DZEMAT_NAME);

  return Response.json(manifest, {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
