import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { Field } from "#app/components/forms/field";

const meta = {
  title: "Forms/Field",
  component: Field,
  args: {
    label: "Naslov",
    hint: "Napišite kratak i jasan naslov.",
    inputProps: { name: "title", id: "story-title" },
  },
} satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "Naslov" });
    await userEvent.type(input, "Susret zajednice");
    await expect(input).toHaveValue("Susret zajednice");
    await expect(input).toHaveAccessibleDescription("Napišite kratak i jasan naslov.");
  },
};
export const ValidationError: Story = { args: { errors: ["Naslov je obavezan."] } };
export const RepeatedName: Story = {
  render: () => (
    <div className="space-y-4">
      <p id="shared-help">Unesite imena za ovaj primjer.</p>
      <Field
        label="Prva osoba"
        hint="Ime bez prezimena."
        errors={["Ime je obavezno."]}
        inputProps={{ name: "person", "aria-describedby": "shared-help" }}
      />
      <Field label="Druga osoba" inputProps={{ name: "person" }} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole("textbox", { name: "Prva osoba" });
    const second = canvas.getByRole("textbox", { name: "Druga osoba" });
    await expect(first.id).not.toBe(second.id);
    await expect(first).toHaveAccessibleDescription(
      "Unesite imena za ovaj primjer. Ime bez prezimena. Ime je obavezno.",
    );
    await expect(first).toHaveAttribute("aria-invalid", "true");
    await expect(second).not.toHaveAttribute("aria-invalid");
  },
};
