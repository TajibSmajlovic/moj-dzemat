/**
   MIME helpers for the image ingestion pipeline. Split out from
   `image.server.ts` so the byte-level type detection (which has no
   sharp dependency) can be tested and reused without booting the
   full image pipeline.
 */

export type AllowedImageMime = "image/jpeg" | "image/png" | "image/webp";

const ALLOWED_IMAGE_MIMES: ReadonlySet<AllowedImageMime> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function isAllowedImageMime(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIMES as ReadonlySet<string>).has(mime);
}

const JPEG_MIME_ALIASES = new Set(["image/jpg", "image/pjpeg", "image/x-citrix-jpeg"]);

/**
   Browsers report JPEGs under a handful of legacy aliases. Normalise
   to the canonical IANA value before doing anything else.
 */
function normalizeClientMime(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (JPEG_MIME_ALIASES.has(t)) {
    return "image/jpeg";
  }

  return t;
}

const IMAGE_SIGNATURES: readonly {
  mime: AllowedImageMime;
  parts: readonly { offset: number; bytes: Buffer }[];
}[] = [
  { mime: "image/jpeg", parts: [{ offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) }] },
  {
    mime: "image/png",
    parts: [{ offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
  },
  {
    mime: "image/webp",
    parts: [
      { offset: 0, bytes: Buffer.from("RIFF", "ascii") },
      { offset: 8, bytes: Buffer.from("WEBP", "ascii") },
    ],
  },
];

/**
   When the browser sends an empty or generic MIME (common with some
   drag/drop paths), infer JPEG / PNG / WebP from magic bytes so sharp
   still accepts the upload.
 */
export function sniffImageMime(buffer: Buffer): AllowedImageMime | null {
  const signature = IMAGE_SIGNATURES.find(({ parts }) =>
    parts.every(({ offset, bytes }) =>
      buffer.subarray(offset, offset + bytes.length).equals(bytes),
    ),
  );
  return signature?.mime ?? null;
}

/**
   Resolve the effective MIME for an uploaded buffer: trust the client
   header when it's a known allowlist value, otherwise fall back to
   magic-byte sniffing. Returns `null` when the bytes are not a
   supported image at all.
 */
export function resolveImageMime(clientMime: string, buffer: Buffer): AllowedImageMime | null {
  const normalized = normalizeClientMime(clientMime || "");
  if (isAllowedImageMime(normalized)) return normalized;

  return sniffImageMime(buffer);
}
