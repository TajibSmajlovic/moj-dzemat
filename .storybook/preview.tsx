import type { Preview } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

import { StoryEnvironment } from "../stories/support/environment";

import "#app/styles/tailwind.css";
import "#app/styles/view-transitions.css";
import "./preview.css";

const preview: Preview = {
  tags: ["autodocs"],
  initialGlobals: { theme: "light" },
  // Axe must measure final font and motion colors, not a partially faded entrance.
  afterEach: async ({ id }) => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    await waitFor(
      () => {
        const running = document
          .getAnimations()
          .filter(
            (animation) =>
              animation.playState === "running" &&
              animation.effect?.getTiming().iterations !== Infinity,
          );
        return expect(running).toHaveLength(0);
      },
      { timeout: 5000 },
    );
    await waitFor(
      () => {
        const fading = [...document.querySelectorAll<HTMLElement>('[style*="opacity"]')].filter(
          (element) => {
            const bounds = element.getBoundingClientRect();
            return (
              // Radix checkbox inputs remain transparent behind the visible control.
              !(element instanceof HTMLInputElement) &&
              bounds.width > 0 &&
              bounds.height > 0 &&
              bounds.top < innerHeight &&
              bounds.bottom > 0 &&
              bounds.left < innerWidth &&
              bounds.right > 0 &&
              element.style.opacity !== "" &&
              Number(element.style.opacity) < 0.99
            );
          },
        );
        return expect(fading).toHaveLength(0);
      },
      { timeout: 5000 },
    );
    document.documentElement.dataset.storyReady = id;
  },
  globalTypes: {
    theme: {
      description: "Preview theme",
      toolbar: { icon: "circlehollow", items: ["light", "dark"], dynamicTitle: true },
    },
  },
  parameters: {
    layout: "padded",
    docs: {
      story: { inline: false },
      description: {
        component:
          "Real Moj Džemat components with fictional data. Each example has an isolated memory router and local browser effects. Theme and viewport controls apply to the preview; actions do not change the main site.",
      },
    },
    viewport: {
      options: {
        mobile: { name: "Mobile", styles: { width: "390px", height: "844px" } },
        desktop: { name: "Desktop", styles: { width: "1440px", height: "1000px" } },
      },
    },
    a11y: { test: "error" },
    options: {
      storySort: { order: ["Welcome", "Foundations", "UI", "Forms", "Layout", "Public", "Admin"] },
    },
  },
  decorators: [
    (Story, context) => (
      <StoryEnvironment
        key={context.id}
        theme={context.globals.theme === "dark" ? "dark" : "light"}
        {...context.parameters.demo}
      >
        <Story />
      </StoryEnvironment>
    ),
  ],
};

export default preview;
