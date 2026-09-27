import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, searchForWorkspaceRoot } from "vite";

export default defineConfig({
  // Set so that every agent runtime can have its own cache directory
  cacheDir: process.env.AGENT_STATE_DIR
    ? path.join(process.env.AGENT_STATE_DIR, "vite-cache")
    : undefined,
  plugins: [tailwindcss(), reactRouter()],
  server: {
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        // Linked installations place React Router's default client entry outside this checkout.
        path.dirname(fileURLToPath(import.meta.resolve("@react-router/dev/package.json"))),
      ],
    },
  },
  // SSR has no index.html for Vite to crawl. Scan routes before the first
  // browser visit so newly discovered dependencies do not invalidate that page.
  optimizeDeps: { entries: ["app/root.tsx", "app/routes/**/*.{ts,tsx}"] },
});
