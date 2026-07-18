/** Build an absolute URL when a site URL is available, otherwise return a root-relative path. */
export function absoluteUrl(siteUrl: string | undefined, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return siteUrl ? `${siteUrl.replace(/\/+$/, "")}${normalizedPath}` : normalizedPath;
}
