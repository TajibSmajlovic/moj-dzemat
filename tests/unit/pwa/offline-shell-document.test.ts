import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildOfflineShellDocument,
  OFFLINE_SHELL_BACKGROUND_COLOR_MARKER,
  OFFLINE_SHELL_SCRIPT_MARKER,
  OFFLINE_SHELL_THEME_COLOR_MARKER,
} from "#app/features/pwa/offline-shell-document";

const template = `
  <meta name="theme-color" content="${OFFLINE_SHELL_THEME_COLOR_MARKER}">
  <style>
    :root {
      --accent: ${OFFLINE_SHELL_THEME_COLOR_MARKER};
      --page: ${OFFLINE_SHELL_BACKGROUND_COLOR_MARKER};
    }
  </style>
  <script>${OFFLINE_SHELL_SCRIPT_MARKER}</script>
`;

describe("offline shell document", () => {
  it("injects the bundled script and shared PWA colors without leaving markers", () => {
    const document = buildOfflineShellDocument(template, 'globalThis.value = "$&</script>";', {
      themeColor: "#123456",
      backgroundColor: "#abcdef",
    });

    expect(document).toContain("globalThis.value");
    expect(document).toContain("$&");
    expect(document).toContain(String.raw`<\/script>`);
    expect(document.match(/#123456/g)).toHaveLength(2);
    expect(document).toContain("#abcdef");
    expect(document).not.toMatch(/__MOJ_DZEMAT_/);
  });

  it("rejects empty scripts and incomplete templates", () => {
    expect(() =>
      buildOfflineShellDocument(template, "  ", {
        themeColor: "#123456",
        backgroundColor: "#abcdef",
      }),
    ).toThrow("script is empty");
    expect(() =>
      buildOfflineShellDocument(OFFLINE_SHELL_SCRIPT_MARKER, "script", {
        themeColor: "#123456",
        backgroundColor: "#abcdef",
      }),
    ).toThrow("template must contain");
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
