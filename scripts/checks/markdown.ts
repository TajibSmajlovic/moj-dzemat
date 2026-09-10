// Preserve line offsets for diagnostics while excluding examples from the
// document's navigation, headings, and plan metadata.
export function withoutCodeFences(contents: string): string {
  let fence: string | undefined;
  return contents
    .split("\n")
    .map((line) => {
      const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      const marker = match?.[1];
      const hidden = Boolean(fence ?? marker);
      if (!fence && marker) fence = marker;
      else if (
        fence &&
        marker?.startsWith(fence.charAt(0)) &&
        marker.length >= fence.length &&
        !match?.[2]?.trim()
      )
        fence = undefined;
      return hidden ? " ".repeat(line.length) : line;
    })
    .join("\n");
}
