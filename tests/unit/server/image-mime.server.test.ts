import { describe, expect, it } from "vitest";

import { resolveImageMime, sniffImageMime } from "#app/server/image-mime.server";

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const WEBP_BYTES = Buffer.from("RIFFxxxxWEBP", "ascii");

describe("image-mime.server", () => {
  describe("sniffImageMime", () => {
    it("detects supported image types from magic bytes", () => {
      expect(sniffImageMime(PNG_BYTES)).toBe("image/png");
      expect(sniffImageMime(JPEG_BYTES)).toBe("image/jpeg");
      expect(sniffImageMime(WEBP_BYTES)).toBe("image/webp");
    });

    it("returns null for unsupported or incomplete byte sequences", () => {
      expect(sniffImageMime(Buffer.from("GIF89a", "ascii"))).toBeNull();
      expect(sniffImageMime(Buffer.from("BM", "ascii"))).toBeNull();
      expect(sniffImageMime(Buffer.from([0xff, 0xd8]))).toBeNull();
      expect(sniffImageMime(Buffer.alloc(0))).toBeNull();
    });
  });

  describe("resolveImageMime", () => {
    it("normalizes allowed JPEG client MIME aliases", () => {
      for (const clientMime of ["image/jpg", "image/pjpeg", "image/x-citrix-jpeg"]) {
        expect(resolveImageMime(clientMime, Buffer.from([0x00]))).toBe("image/jpeg");
      }
    });

    it("handles client MIME casing and surrounding whitespace", () => {
      expect(resolveImageMime(" IMAGE/PNG ", Buffer.from([0x00]))).toBe("image/png");
      expect(resolveImageMime("Image/WebP", Buffer.from([0x00]))).toBe("image/webp");
    });

    it("prefers a trusted allowlist client MIME over sniffed bytes", () => {
      expect(resolveImageMime("image/jpeg", PNG_BYTES)).toBe("image/jpeg");
    });

    it("falls back to magic-byte sniffing when the client MIME is missing or unsupported", () => {
      expect(resolveImageMime("", PNG_BYTES)).toBe("image/png");
      expect(resolveImageMime("application/octet-stream", JPEG_BYTES)).toBe("image/jpeg");
      expect(resolveImageMime("image/gif", WEBP_BYTES)).toBe("image/webp");
    });

    it("returns null when neither the client MIME nor bytes identify a supported image", () => {
      expect(resolveImageMime("", Buffer.from([0x01, 0x02, 0x03]))).toBeNull();
      expect(resolveImageMime("application/pdf", Buffer.from("%PDF", "ascii"))).toBeNull();
    });
  });
});
