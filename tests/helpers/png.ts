/**
 * 1×1 fully-transparent PNG, base64-encoded. Tiny enough to keep tests
 * fast but valid enough for sharp / PNG decoders to accept and
 * re-encode (e.g. into WebP via the post-image upload pipeline).
 */
export const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Z8W0AAAAASUVORK5CYII=";

export function tinyPngFile(name = "img.png"): File {
  const buffer = Buffer.from(TINY_PNG_BASE64, "base64");

  return new File([buffer], name, { type: "image/png" });
}
