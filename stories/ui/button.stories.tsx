import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Button } from "#app/components/ui/button";

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Sačuvaj", onClick: fn() },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Sačuvaj" }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Destructive: Story = { args: { variant: "destructive", children: "Obriši" } };
export const Disabled: Story = { args: { disabled: true } };
export const VariantsAndSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="outline" size="sm">
        Pregled
      </Button>
      <Button variant="ghost">Odustani</Button>
      <Button variant="link">Saznaj više</Button>
      <Button size="lg">Sačuvaj izmjene</Button>
    </div>
  ),
};
