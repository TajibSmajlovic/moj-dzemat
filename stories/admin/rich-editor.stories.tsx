import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { RichEditor } from "#app/features/posts/admin/components/rich-editor";

function EditorDemo({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState("<p>Dobro došli u našu zajednicu.</p>");
  return (
    <div className="max-w-3xl">
      <RichEditor
        disabled={disabled}
        value={value}
        onChange={setValue}
        id="story-editor"
        label="Tekst"
      />
      <output className="sr-only" aria-label="Sadržaj">
        {value}
      </output>
    </div>
  );
}

const meta = { title: "Admin/Rich Editor", component: EditorDemo } satisfies Meta<
  typeof EditorDemo
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Editable: Story = {
  play: async ({ canvasElement }) => {
    const editor = await within(canvasElement).findByRole("textbox", { name: "Tekst" });
    await userEvent.click(editor);
    await userEvent.type(editor, "Pozivamo vas na druženje.");
    await expect(editor).toHaveTextContent("Pozivamo vas na druženje.");
    await expect(within(canvasElement).getByRole("status", { name: "Sadržaj" })).toHaveTextContent(
      "Pozivamo vas na druženje.",
    );
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const editor = await within(canvasElement).findByRole("textbox", { name: "Tekst" });
    await expect(editor).toHaveAttribute("contenteditable", "false");
    for (const button of within(canvasElement).getAllByRole("button"))
      await expect(button).toBeDisabled();
  },
};
