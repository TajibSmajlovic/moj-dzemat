import { invariantResponse } from "#app/lib/invariant";
import { getCurrentUser } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";

import type { Route } from "./+types/slike.$id";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function toResponseBody(data: Uint8Array | Buffer): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(data.byteLength);
  bytes.set(data);
  return bytes;
}

/**
 * Streams a single post image blob. Images are content-addressable by
 * their database id and live forever at this URL (we only ever insert
 * new rows, never mutate), so we set a long immutable cache header and
 * let browsers + CDNs do the heavy lifting.
 *
 * The body is copied into a plain `Uint8Array` backed by a single
 * `ArrayBuffer` so every runtime (Node + undici) streams the exact byte
 * length browsers expect — some Buffer subclasses have tripped
 * `Content-Length` / body mismatches in the past.
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  const image = await prisma.postImage.findUnique({
    where: { id: params.id },
    select: {
      data: true,
      contentType: true,
      post: { select: { status: true } },
    },
  });

  invariantResponse(image, "Not found", { status: 404 });

  invariantResponse(
    image.post.status === "published" || (await getCurrentUser(request)),
    "Not found",
    { status: 404 },
  );

  const body = toResponseBody(image.data);
  const contentType = image.contentType?.startsWith("image/") ? image.contentType : "image/webp";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${ONE_YEAR_SECONDS}, immutable`,
    },
  });
}

// Do not add `ErrorBoundary` here: @react-router/dev only treats a route as a
// resource route (raw `loader` Response, no HTML shell) when there is no
// default export *and* no ErrorBoundary. An ErrorBoundary would make `/slike/*`
// return `text/html` and break `<img src="/slike/...">`.
