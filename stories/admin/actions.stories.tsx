import { useLoaderData } from "react-router";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pin, PinOff } from "lucide-react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { AdminPageHeader } from "#app/components/admin/admin-page-header";
import { OptimisticToggleIconButton } from "#app/components/admin/optimistic-toggle-button";
import { Button } from "#app/components/ui/button";

function ToggleDemo() {
  const data = useLoaderData<{ active: boolean } | null>();
  return (
    <OptimisticToggleIconButton
      id="fictional-post"
      intent={data?.active ? "unpin" : "pin"}
      active={data?.active ?? false}
      tone="primary"
      activeLabel="Ukloni oznaku"
      inactiveLabel="Istakni objavu"
      activeIcon={<PinOff />}
      inactiveIcon={<Pin />}
    />
  );
}

const meta = { title: "Admin/Actions", component: ToggleDemo } satisfies Meta<typeof ToggleDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Toggle: Story = {
  parameters: {
    demo: {
      action: async ({ request }: { request: Request }) => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const formData = await request.formData();
        return {
          ok: true,
          active: formData.get("intent") === "pin",
          toast: {
            id: crypto.randomUUID(),
            type: "success",
            description: "Oznaka je sačuvana u primjeru.",
          },
        };
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Istakni objavu" }));
    await expect(canvas.getByRole("button", { name: "Ukloni oznaku" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await waitFor(() =>
      expect(within(document.body).getByText("Oznaka je sačuvana u primjeru.")).toBeVisible(),
    );
    await expect(canvas.getByRole("button", { name: "Ukloni oznaku" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};
export const FailedToggle: Story = {
  parameters: {
    demo: {
      action: async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        return {
          ok: true,
          active: false,
          toast: {
            id: crypto.randomUUID(),
            type: "error",
            description: "Čuvanje nije uspjelo. Pokušajte ponovo.",
          },
        };
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Istakni objavu" }));
    await expect(canvas.getByRole("button", { name: "Ukloni oznaku" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await waitFor(() =>
      expect(
        within(document.body).getByText("Čuvanje nije uspjelo. Pokušajte ponovo."),
      ).toBeVisible(),
    );
    await expect(await canvas.findByRole("button", { name: "Istakni objavu" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  },
};
export const PageHeader: StoryObj = {
  render: () => (
    <AdminPageHeader
      title="Objave"
      description="Upravljanje izmišljenim sadržajem zajednice."
      backTo="/admin"
      actions={<Button>Nova objava</Button>}
    />
  ),
};
