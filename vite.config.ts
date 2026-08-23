import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // Set so that every agent runtime can have its own cache directory
  cacheDir: process.env.AGENT_STATE_DIR
    ? path.join(process.env.AGENT_STATE_DIR, "vite-cache")
    : undefined,
  plugins: [tailwindcss(), reactRouter()],
});
