export const YOUTUBE_PROVIDER = "youtube";
export type VideoProvider = typeof YOUTUBE_PROVIDER;

export const MAX_VIDEOS_PER_POST = 3;

export type ParsedVideo = {
  provider: VideoProvider;
  videoId: string;
  url: string;
};

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
]);

function extractYouTubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    if (!id) return null;

    return id;
  }

  if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    if (url.pathname.startsWith("/embed/")) {
      const id = url.pathname.slice("/embed/".length).split("/")[0];
      if (!id) return null;

      return id;
    }
  }

  return null;
}

export function parseYouTubeUrl(raw: string): ParsedVideo | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const id = extractYouTubeId(url);
  if (!id || !YOUTUBE_ID_RE.test(id)) return null;

  return { provider: YOUTUBE_PROVIDER, videoId: id, url: youtubeWatchUrl(id) };
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeEmbedUrl(videoId: string, options: { autoplay?: boolean } = {}): string {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (options.autoplay) params.set("autoplay", "1");

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
