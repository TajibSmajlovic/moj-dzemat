import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "#app/lib/brand-assets", replacement: path.resolve("stories/mocks/brand-assets.ts") },
      { find: "#app/platform/clipboard", replacement: path.resolve("stories/mocks/clipboard.ts") },
      { find: "#app/lib/date", replacement: path.resolve("stories/mocks/date.ts") },
      {
        find: "#app/features/posts/post-routes",
        replacement: path.resolve("stories/mocks/post-routes.ts"),
      },
      { find: "#app/lib/share", replacement: path.resolve("stories/mocks/share.ts") },
      { find: "#app/features/theme/theme", replacement: path.resolve("stories/mocks/theme.ts") },
      {
        find: "#app/features/web-push/web-push",
        replacement: path.resolve("stories/mocks/web-push.tsx"),
      },
      {
        find: "#app/features/posts/post-video",
        replacement: path.resolve("stories/mocks/post-video.ts"),
      },
      { find: "#app", replacement: path.resolve("app") },
    ],
  },
});
