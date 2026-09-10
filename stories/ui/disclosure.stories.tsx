import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog } from "radix-ui";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { Accordion } from "#app/components/ui/accordion";
import { Button } from "#app/components/ui/button";
import { ConfirmAction } from "#app/components/ui/confirm-action";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "#app/components/ui/sheet";
const meta = { title: "UI/Disclosure" } satisfies Meta;
export default meta;
export const NativeAccordion: StoryObj = {
  render: () => (
    <Accordion
      items={[
        { id: "one", title: "Kada se održava druženje?", text: "U subotu nakon podne-namaza." },
        {
          id: "two",
          title: "Da li je potrebna prijava?",
          text: "Prijava nije potrebna. Dobrodošli ste.",
        },
      ]}
      getItemId={(item) => item.id}
      renderTrigger={(item) => item.title}
      renderContent={(item) => <p>{item.text}</p>}
    />
  ),
  play: async ({ canvasElement }) => {
    const summary = within(canvasElement).getByText("Kada se održava druženje?");
    await userEvent.click(summary);
    await expect(canvasElement.querySelector("details")).toHaveAttribute("open");
  },
};
export const Confirmation: StoryObj<{ onConfirm: () => void }> = {
  args: { onConfirm: fn() },
  render: (args) => (
    <ConfirmAction
      title="Obrisati primjer?"
      description="Radnja se simulira. Stvarni podaci ostaju sigurni."
      confirmLabel="Obriši primjer"
      onConfirm={args.onConfirm}
    >
      <Button variant="destructive">Obriši</Button>
    </ConfirmAction>
  ),
  play: async ({ canvasElement, args }) => {
    const page = within(canvasElement.ownerDocument.body);
    const trigger = within(canvasElement).getByRole("button", { name: "Obriši" });
    await userEvent.click(trigger);
    await waitFor(() => expect(page.getByRole("alertdialog")).toBeVisible());
    await expect(page.getByRole("button", { name: "Odustani" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.click(trigger);
    await userEvent.click(page.getByRole("button", { name: "Obriši primjer" }));
    await expect(args.onConfirm).toHaveBeenCalledOnce();
  },
};
export const SideSheet: StoryObj = {
  render: () => (
    <Sheet>
      <Dialog.Trigger asChild>
        <Button>Otvori obrazac</Button>
      </Dialog.Trigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Novo pitanje</SheetTitle>
          <SheetDescription>Primjer bočnog panela sa sadržajem.</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <Dialog.Close asChild>
            <Button variant="outline">Zatvori</Button>
          </Dialog.Close>
        </div>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Otvori obrazac" }));
    await waitFor(() => expect(page.getByRole("dialog")).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(within(canvasElement).getByRole("button", { name: "Otvori obrazac" })).toHaveFocus(),
    );
  },
};
