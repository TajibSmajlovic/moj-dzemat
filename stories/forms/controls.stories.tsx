import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { FormActions } from "#app/components/forms/form-actions";
import { PasswordField } from "#app/components/forms/password-field";
import { SelectField } from "#app/components/forms/select-field";
import { TextareaField } from "#app/components/forms/textarea-field";
import { Button } from "#app/components/ui/button";
import { Checkbox } from "#app/components/ui/checkbox";
import { Label } from "#app/components/ui/label";
const meta = { title: "Forms/Controls" } satisfies Meta;
export default meta;
export const Password: StoryObj = {
  render: () => (
    <PasswordField
      label="Lozinka"
      hint="Najmanje 12 znakova."
      inputProps={{ defaultValue: "PrimjerLozinke123" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Lozinka");
    await expect(input).toHaveAttribute("type", "password");
    await userEvent.click(canvas.getByRole("button", { name: "Prikaži lozinku" }));
    await expect(input).toHaveAttribute("type", "text");
    await expect(input).toHaveValue("PrimjerLozinke123");
  },
};
export const PasswordDisabled: StoryObj = {
  render: () => (
    <PasswordField
      label="Lozinka"
      inputProps={{ disabled: true, defaultValue: "PrimjerLozinke123" }}
    />
  ),
};
export const Selection: StoryObj = {
  render: () => (
    <SelectField
      label="Vrsta objave"
      placeholder="Odaberite vrstu"
      selectProps={{ defaultValue: "" }}
    >
      <option value="obavijest">Obavijest</option>
      <option value="hutba">Hutba</option>
    </SelectField>
  ),
  play: async ({ canvasElement }) => {
    const select = within(canvasElement).getByRole("combobox", { name: "Vrsta objave" });
    await userEvent.selectOptions(select, "hutba");
    await expect(select).toHaveValue("hutba");
  },
};
export const Textarea: StoryObj = {
  render: () => (
    <TextareaField
      label="Vaša poruka"
      hint="Pišite jasno i sažeto."
      errors={["Poruka mora sadržavati najmanje 10 znakova."]}
      textareaProps={{ defaultValue: "Pozdrav", rows: 4 }}
    />
  ),
};
export const ReadOnly: StoryObj = {
  render: () => (
    <TextareaField
      label="Objavljeni odgovor"
      textareaProps={{ defaultValue: "Ovaj odgovor je dostupan samo za čitanje.", readOnly: true }}
    />
  ),
};
export const CheckboxField: StoryObj = {
  render: () => (
    <div className="flex items-center gap-3">
      <Checkbox id="demo-checkbox" />
      <Label htmlFor="demo-checkbox">Istakni objavu na početnoj</Label>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("checkbox");
    await userEvent.click(box);
    await expect(box).toBeChecked();
  },
};
export const Actions: StoryObj = {
  render: () => (
    <FormActions>
      <Button variant="outline">Odustani</Button>
      <Button>Sačuvaj</Button>
    </FormActions>
  ),
};
export const StickyActions: StoryObj = {
  render: () => (
    <div className="max-w-xl">
      <p className="mb-8">Akcije ostaju dostupne na dnu obrasca.</p>
      <FormActions sticky>
        <Button variant="outline">Odustani</Button>
        <Button disabled>Čuvanje…</Button>
      </FormActions>
    </div>
  ),
};
