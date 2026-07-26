import { describe, expect, it } from "vitest";

import {
  MAX_VIDEOS_PER_POST,
  parseYouTubeUrl,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
} from "#app/features/posts/post-video";

const VIDEO_ID = "dQw4w9WgXcQ";

describe("post-video", () => {
  describe("parseYouTubeUrl", () => {
    it.each([
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ])("extracts the id from %s", (url) => {
      expect(parseYouTubeUrl(url)).toEqual({
        provider: "youtube",
        videoId: VIDEO_ID,
        url: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
      });
    });

    it.each([
      "",
      "not a url",
      "ftp://youtu.be/dQw4w9WgXcQ",
      "https://vimeo.com/12345",
      "https://www.youtube.com/",
      "https://www.youtube.com/watch?v=tooLong12chars",
      "https://youtu.be/short",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ])("returns null for unsupported input %s", (url) => {
      expect(parseYouTubeUrl(url)).toBeNull();
    });
  });

  it("builds YouTube embed URLs", () => {
    const url = youtubeEmbedUrl(VIDEO_ID);
    expect(url).toContain(`youtube-nocookie.com/embed/${VIDEO_ID}`);
    expect(url).toContain("rel=0");
    expect(url).toContain("modestbranding=1");
    expect(url).not.toContain("autoplay=1");

    expect(youtubeEmbedUrl(VIDEO_ID, { autoplay: true })).toContain("autoplay=1");
  });

  it("builds YouTube thumbnail URLs", () => {
    expect(youtubeThumbnailUrl(VIDEO_ID)).toBe(`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`);
  });

  it("exports the per-post cap", () => {
    expect(MAX_VIDEOS_PER_POST).toBe(3);
  });
});
