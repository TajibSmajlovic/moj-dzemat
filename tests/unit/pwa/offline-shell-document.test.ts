import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildOfflineShellDocument,
  OFFLINE_SHELL_BACKGROUND_COLOR_MARKER,
  OFFLINE_SHELL_LOGO_MARKER,
  OFFLINE_SHELL_LORA_LATIN_EXT_FONT_MARKER,
  OFFLINE_SHELL_LORA_LATIN_FONT_MARKER,
  OFFLINE_SHELL_SCRIPT_MARKER,
  OFFLINE_SHELL_THEME_COLOR_MARKER,
} from "#app/features/pwa/offline-shell-document";

const template = `
  <meta name="theme-color" content="${OFFLINE_SHELL_THEME_COLOR_MARKER}">
  <style>
    @font-face {
      src: url("data:font/woff2;base64,${OFFLINE_SHELL_LORA_LATIN_FONT_MARKER}");
    }
    @font-face {
      src: url("data:font/woff2;base64,${OFFLINE_SHELL_LORA_LATIN_EXT_FONT_MARKER}");
    }
    :root {
      --accent: ${OFFLINE_SHELL_THEME_COLOR_MARKER};
      --page: ${OFFLINE_SHELL_BACKGROUND_COLOR_MARKER};
    }
  </style>
  <span>${OFFLINE_SHELL_LOGO_MARKER}</span>
  <script>${OFFLINE_SHELL_SCRIPT_MARKER}</script>
`;

const documentOptions = {
  themeColor: "#123456",
  backgroundColor: "#abcdef",
  logoSvg: '<svg viewBox="0 0 1 1"></svg>',
  loraLatinFontBase64: "Zm9udA==",
  loraLatinExtendedFontBase64: "Zm9udC1leHQ=",
};

describe("offline shell document", () => {
  it("injects the bundled script and shared PWA colors without leaving markers", () => {
    const document = buildOfflineShellDocument(
      template,
      'globalThis.value = "$&</script>";',
      documentOptions,
    );

    expect(document).toContain("globalThis.value");
    expect(document).toContain("$&");
    expect(document).toContain(String.raw`<\/script>`);
    expect(document.match(/#123456/g)).toHaveLength(2);
    expect(document).toContain("#abcdef");
    expect(document).toContain('<svg viewBox="0 0 1 1"></svg>');
    expect(document).toContain("Zm9udA==");
    expect(document).toContain("Zm9udC1leHQ=");
    expect(document).not.toMatch(/__MOJ_DZEMAT_/);
  });

  it("rejects empty scripts and incomplete templates", () => {
    expect(() => buildOfflineShellDocument(template, "  ", documentOptions)).toThrow(
      "script is empty",
    );
    expect(() =>
      buildOfflineShellDocument(OFFLINE_SHELL_SCRIPT_MARKER, "script", documentOptions),
    ).toThrow("template must contain");
  });

  it("rejects unsafe logo markup and invalid font data", () => {
    expect(() =>
      buildOfflineShellDocument(template, "script", {
        ...documentOptions,
        logoSvg: "<svg><script>bad()</script></svg>",
      }),
    ).toThrow("non-script SVG");
    expect(() =>
      buildOfflineShellDocument(template, "script", {
        ...documentOptions,
        loraLatinFontBase64: "not base64",
      }),
    ).toThrow("non-empty base64");
  });

  it("keeps the source shell self-contained with a static no-script fallback", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "app/features/pwa/offline.html"),
      "utf8",
    );

    expect(source).not.toMatch(/<(?:script|link)[^>]+(?:src|href)=["']https?:/i);
    expect(source).not.toMatch(/<(?:img|iframe|video|audio)\b/i);
    expect(source).toContain('id="offline-app"');
    expect(source).toContain("Trenutno niste povezani na internet");
    expect(source).toContain(OFFLINE_SHELL_SCRIPT_MARKER);
  });
});
