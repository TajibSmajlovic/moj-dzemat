/**
 * 1×1 fully-transparent PNG, base64-encoded. Tiny enough to keep tests
 * fast but valid enough for sharp / PNG decoders to accept and
 * re-encode (e.g. into WebP via the post-image upload pipeline).
 */
export const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==";

export function tinyPngFile(name = "img.png"): File {
  const buffer = Buffer.from(TINY_PNG_BASE64, "base64");

  return new File([buffer], name, { type: "image/png" });
}
