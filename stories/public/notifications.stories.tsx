import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { WebPushCard } from "#app/features/web-push/components/web-push-card";
import { WebPushPromptView } from "#app/features/web-push/components/web-push-prompt";
const meta = {
  title: "Public/Notifications",
  component: WebPushCard,
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "The real card uses a simulated provider. Buttons demonstrate transitions without permission prompts, service workers or subscriptions.",
      },
    },
  },
} satisfies Meta<typeof WebPushCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ready: Story = {
  parameters: { demo: { pushState: "ready" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Uključi obavijesti" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: "Isključi" })).toBeVisible());
    await userEvent.click(canvas.getByRole("button", { name: "Isključi" }));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Uključi obavijesti" })).toBeVisible(),
    );
  },
};
export const Enabled: Story = { parameters: { demo: { pushState: "enabled" } } };
export const Denied: Story = { parameters: { demo: { pushState: "denied" } } };
export const Unsupported: Story = { parameters: { demo: { pushState: "unsupported" } } };
export const InstallRequired: Story = {
  parameters: { demo: { pushState: "install-required" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Kako uključiti" }));
    await waitFor(() => expect(canvas.getByText("Dodaj na početni ekran")).toBeVisible());
  },
};
export const Retry: Story = { parameters: { demo: { pushState: "retry" } } };
export const Failed: Story = { parameters: { demo: { pushState: "enable-failed" } } };
export const Paused: Story = { parameters: { demo: { pushState: "paused" } } };
export const Busy: Story = { parameters: { demo: { pushState: "synchronizing" } } };

function PromptDemo() {
  const [visible, setVisible] = useState(true);
  return visible ? (
    <WebPushPromptView onDismiss={() => setVisible(false)} />
  ) : (
    <p>Ponuda je zatvorena u ovom primjeru.</p>
  );
}
export const Prompt: Story = {
  parameters: { demo: { pushState: "ready" }, layout: "fullscreen" },
  render: () => <PromptDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Zatvori ponudu za obavijesti" }));
    await expect(canvas.getByText("Ponuda je zatvorena u ovom primjeru.")).toBeVisible();
  },
};
