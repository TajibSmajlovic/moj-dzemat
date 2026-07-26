import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const PUBLIC_DIRECTORY = path.resolve(import.meta.dirname, "../../../public");

describe("PWA install icons", () => {
  it.each([
    ["pwa-icon-192.png", 192],
    ["pwa-icon-512.png", 512],
  ])("provides a transparent %s at the declared size", async (fileName, size) => {
    const image = sharp(path.join(PUBLIC_DIRECTORY, fileName));
    const [metadata, statistics] = await Promise.all([image.metadata(), image.stats()]);

    expect(metadata).toMatchObject({
      format: "png",
      width: size,
      height: size,
      hasAlpha: true,
    });
    expect(statistics.isOpaque).toBe(false);
  });

  it("provides an opaque 512px maskable icon", async () => {
    const image = sharp(path.join(PUBLIC_DIRECTORY, "pwa-icon-maskable-512.png"));
    const [metadata, statistics] = await Promise.all([image.metadata(), image.stats()]);

    expect(metadata).toMatchObject({
      format: "png",
      width: 512,
      height: 512,
    });
    expect(statistics.isOpaque).toBe(true);
  });
});
