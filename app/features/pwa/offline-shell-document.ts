export const OFFLINE_SHELL_SCRIPT_MARKER = "__MOJ_DZEMAT_OFFLINE_SHELL_SCRIPT__";
export const OFFLINE_SHELL_THEME_COLOR_MARKER = "__MOJ_DZEMAT_PWA_THEME_COLOR__";
export const OFFLINE_SHELL_BACKGROUND_COLOR_MARKER = "__MOJ_DZEMAT_PWA_BACKGROUND_COLOR__";

type OfflineShellDocumentOptions = {
  themeColor: string;
  backgroundColor: string;
};

export function buildOfflineShellDocument(
  template: string,
  javascript: string,
  { themeColor, backgroundColor }: OfflineShellDocumentOptions,
): string {
  if (!javascript.trim()) {
    throw new Error("The offline shell script is empty.");
  }

  assertMarkerCount(template, OFFLINE_SHELL_SCRIPT_MARKER, 1);
  assertMarkerCount(template, OFFLINE_SHELL_THEME_COLOR_MARKER, 2);
  assertMarkerCount(template, OFFLINE_SHELL_BACKGROUND_COLOR_MARKER, 1);

  // Prevent bundled string contents from terminating the enclosing inline
  // script. The replacement has the same JavaScript string semantics.
  const inlineSafeJavascript = javascript.replaceAll("</script", String.raw`<\/script`);

  return template
    .replace(OFFLINE_SHELL_SCRIPT_MARKER, () => inlineSafeJavascript)
    .replaceAll(OFFLINE_SHELL_THEME_COLOR_MARKER, themeColor)
    .replaceAll(OFFLINE_SHELL_BACKGROUND_COLOR_MARKER, backgroundColor);
}

function assertMarkerCount(template: string, marker: string, expectedCount: number): void {
  const markerCount = template.split(marker).length - 1;

  if (markerCount !== expectedCount) {
    throw new Error(
      `The offline shell template must contain ${String(expectedCount)} ${marker} marker(s).`,
    );
  }
}
