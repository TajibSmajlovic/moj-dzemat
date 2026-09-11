import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-vite",
    options: { builder: { viteConfigPath: ".storybook/vite.config.ts" } },
  },
  staticDirs: ["../public"],
  stories: ["../stories/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest"],
  core: { disableTelemetry: true },
};

export default config;
