import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./.storybook/vite.config.ts";

export default defineConfig({
  test: {
    projects: ["light", "dark"].map((theme) =>
      mergeConfig(
        viteConfig,
        defineConfig({
          plugins: [
            storybookTest({
              configDir: `${import.meta.dirname}/.storybook`,
              initialGlobals: { theme },
            }),
          ],
          test: {
            name: `storybook-${theme}`,
            browser: {
              enabled: true,
              provider: playwright({ contextOptions: { reducedMotion: "reduce" } }),
              headless: true,
              instances: [{ browser: "chromium" }],
            },
          },
        }),
      ),
    ),
  },
});
