import { getCurrentUser } from "#app/features/auth/auth.server";
import { invariantResponse } from "#app/lib/invariant";
import { DAY_SECONDS } from "#app/lib/time";
import { prisma } from "#app/server/db.server";

import type { Route } from "./+types/slike.$id";

const ONE_YEAR_SECONDS = 365 * DAY_SECONDS;

function toResponseBody(data: Uint8Array | Buffer): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(data.byteLength);
  bytes.set(data);
  return bytes;
}

/**
   Streams a single post image blob. An existing image id always resolves to
   the same bytes; edits insert a new row rather than replacing image data.
   That makes a long immutable cache safe, while deleting the row still makes
   future uncached requests return 404.

   The body is copied into a plain `Uint8Array` backed by a single
   `ArrayBuffer` so every runtime (Node + undici) streams the exact byte
   length browsers expect — some Buffer subclasses have tripped
   `Content-Length` / body mismatches in the past.
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

  invariantResponse(image, "Slika nije pronađena.", { status: 404 });

  const isPublished = image.post.status === "published";
  const currentUser = isPublished ? null : await getCurrentUser(request);

  invariantResponse(isPublished || currentUser, "Slika nije pronađena.", { status: 404 });

  const body = toResponseBody(image.data);
  const contentType = image.contentType?.startsWith("image/") ? image.contentType : "image/webp";
  const cacheControl = isPublished
    ? `public, max-age=${ONE_YEAR_SECONDS}, immutable`
    : "private, no-store";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    },
  });
}

// Do not add `ErrorBoundary` here: @react-router/dev only treats a route as a
// resource route (raw `loader` Response, no HTML shell) when there is no
// default export *and* no ErrorBoundary. An ErrorBoundary would make `/slike/*`
// return `text/html` and break `<img src="/slike/...">`.
