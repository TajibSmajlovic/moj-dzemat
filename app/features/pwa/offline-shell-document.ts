export const OFFLINE_SHELL_SCRIPT_MARKER = "__MOJ_DZEMAT_OFFLINE_SHELL_SCRIPT__";
export const OFFLINE_SHELL_THEME_COLOR_MARKER = "__MOJ_DZEMAT_PWA_THEME_COLOR__";
export const OFFLINE_SHELL_BACKGROUND_COLOR_MARKER = "__MOJ_DZEMAT_PWA_BACKGROUND_COLOR__";
export const OFFLINE_SHELL_LOGO_MARKER = "__MOJ_DZEMAT_OFFLINE_LOGO__";
export const OFFLINE_SHELL_LORA_LATIN_FONT_MARKER = "__MOJ_DZEMAT_LORA_LATIN_FONT__";
export const OFFLINE_SHELL_LORA_LATIN_EXT_FONT_MARKER = "__MOJ_DZEMAT_LORA_LATIN_EXT_FONT__";

type OfflineShellDocumentOptions = {
  themeColor: string;
  backgroundColor: string;
  logoSvg: string;
  loraLatinFontBase64: string;
  loraLatinExtendedFontBase64: string;
};

export function buildOfflineShellDocument(
  template: string,
  javascript: string,
  {
    themeColor,
    backgroundColor,
    logoSvg,
    loraLatinFontBase64,
    loraLatinExtendedFontBase64,
  }: OfflineShellDocumentOptions,
): string {
  if (!javascript.trim()) {
    throw new Error("The offline shell script is empty.");
  }
  if (!isSafeInlineLogo(logoSvg)) {
    throw new Error("The offline shell logo must be a non-script SVG.");
  }
  if (!isBase64(loraLatinFontBase64) || !isBase64(loraLatinExtendedFontBase64)) {
    throw new Error("The offline shell fonts must be non-empty base64 values.");
  }

  assertMarkerCount(template, OFFLINE_SHELL_SCRIPT_MARKER, 1);
  assertMarkerCount(template, OFFLINE_SHELL_THEME_COLOR_MARKER, 2);
  assertMarkerCount(template, OFFLINE_SHELL_BACKGROUND_COLOR_MARKER, 1);
  assertMarkerCount(template, OFFLINE_SHELL_LOGO_MARKER, 1);
  assertMarkerCount(template, OFFLINE_SHELL_LORA_LATIN_FONT_MARKER, 1);
  assertMarkerCount(template, OFFLINE_SHELL_LORA_LATIN_EXT_FONT_MARKER, 1);

  // Prevent bundled string contents from terminating the enclosing inline
  // script. The replacement has the same JavaScript string semantics.
  const inlineSafeJavascript = javascript.replaceAll("</script", String.raw`<\/script`);

  return template
    .replace(OFFLINE_SHELL_SCRIPT_MARKER, () => inlineSafeJavascript)
    .replaceAll(OFFLINE_SHELL_THEME_COLOR_MARKER, themeColor)
    .replaceAll(OFFLINE_SHELL_BACKGROUND_COLOR_MARKER, backgroundColor)
    .replace(OFFLINE_SHELL_LOGO_MARKER, () => logoSvg)
    .replace(OFFLINE_SHELL_LORA_LATIN_FONT_MARKER, loraLatinFontBase64)
    .replace(OFFLINE_SHELL_LORA_LATIN_EXT_FONT_MARKER, loraLatinExtendedFontBase64);
}

function assertMarkerCount(template: string, marker: string, expectedCount: number): void {
  const markerCount = template.split(marker).length - 1;

  if (markerCount !== expectedCount) {
    throw new Error(
      `The offline shell template must contain ${String(expectedCount)} ${marker} marker(s).`,
    );
  }
}

function isSafeInlineLogo(value: string): boolean {
  const trimmed = value.trim();

  return trimmed.startsWith("<svg") && trimmed.endsWith("</svg>") && !/<script\b/i.test(trimmed);
}

function isBase64(value: string): boolean {
  return value.length > 0 && value.length % 4 === 0 && /^[A-Za-z\d+/]+={0,2}$/.test(value);
}
