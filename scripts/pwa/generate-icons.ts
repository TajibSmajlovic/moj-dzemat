import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { PWA_BACKGROUND_COLOR } from "../../app/features/pwa/pwa-config";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publicDirectory = path.join(projectRoot, "public");
const sourceLogo = path.join(publicDirectory, "logo.png");
const maskableLogoSize = 352;

const pngOptions = {
  adaptiveFiltering: false,
  compressionLevel: 9,
  palette: false,
};

async function transparentIcon(size: number, fileName: string): Promise<void> {
  await sharp(sourceLogo)
    .resize(size, size, { fit: "contain" })
    .png(pngOptions)
    .toFile(path.join(publicDirectory, fileName));
}

async function maskableIcon(): Promise<void> {
  const logo = await sharp(sourceLogo)
    .resize(maskableLogoSize, maskableLogoSize, { fit: "contain" })
    .png(pngOptions)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: PWA_BACKGROUND_COLOR,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png(pngOptions)
    .toFile(path.join(publicDirectory, "pwa-icon-maskable-512.png"));
}

await Promise.all([
  transparentIcon(192, "pwa-icon-192.png"),
  transparentIcon(512, "pwa-icon-512.png"),
  maskableIcon(),
]);
