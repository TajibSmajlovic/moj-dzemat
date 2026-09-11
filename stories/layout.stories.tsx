import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Field } from "#app/components/forms/field";
import { PasswordField } from "#app/components/forms/password-field";
import { PublicAuthShell } from "#app/components/layout/auth-shell";
import { DzematLocationSection } from "#app/components/layout/dzemat-location-section";
import { PageMain } from "#app/components/layout/page-main";
import { RootErrorBoundary } from "#app/components/layout/root-error-boundary";
import { SegmentErrorBoundary } from "#app/components/layout/segment-error-boundary";
import { SiteFooter } from "#app/components/layout/site-footer";
import { SiteHeader } from "#app/components/layout/site-header";
import { Button } from "#app/components/ui/button";
import { ThemeToggle } from "#app/features/theme/components/theme-toggle";

import embed from "./fixtures/embed.html?url";
const meta = { title: "Layout", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
export const Header: StoryObj = { render: () => <SiteHeader /> };
export const ActiveNavigation: StoryObj = {
  parameters: { demo: { path: "/pitanja-i-odgovori" } },
  render: () => <SiteHeader />,
};
export const Footer: StoryObj = { render: () => <SiteFooter /> };
export const Page: StoryObj = {
  render: () => (
    <>
      <SiteHeader />
      <PageMain>
        <h1 className="font-display text-3xl">Naslov stranice</h1>
        <p className="mt-4">Primjer javnog sadržaja unutar zajedničkog okvira.</p>
      </PageMain>
      <SiteFooter />
    </>
  ),
};
export const Auth: StoryObj = {
  render: () => (
    <PublicAuthShell
      announcement={null}
      eyebrow="Administracija"
      title="Dobro došli nazad"
      description="Pristup upravljanju sadržajem."
      panelTitle="Prijava"
    >
      <form onSubmit={(event) => event.preventDefault()} className="space-y-4">
        <Field label="Email" inputProps={{ type: "email", autoComplete: "email" }} />
        <PasswordField label="Lozinka" inputProps={{ autoComplete: "current-password" }} />
        <Button>Prijavi se</Button>
      </form>
    </PublicAuthShell>
  ),
};
export const MissingContent: StoryObj = {
  render: () => (
    <SegmentErrorBoundary
      error={{ status: 404, statusText: "Not Found", internal: false, data: null }}
    />
  ),
};
export const AdminFailure: StoryObj = {
  render: () => (
    <SegmentErrorBoundary
      error={{ status: 500, statusText: "Server Error", internal: false, data: null }}
      tone="admin"
      backTo="/admin"
      backLabel="Povratak u administraciju"
    />
  ),
};
export const RootFailure: StoryObj = {
  render: () => (
    <RootErrorBoundary
      error={{ status: 500, statusText: "Server Error", internal: false, data: null }}
    />
  ),
};
export const Location: StoryObj = {
  render: () => (
    <DzematLocationSection
      siteName="Moj Džemat - Primjer"
      location={{
        query: "Grad",
        address: "Ulica primjera 1, Grad",
        mapsUrl: embed,
        directionsUrl: embed,
        embedUrl: embed,
      }}
    />
  ),
};
export const ThemeControl: StoryObj = {
  render: () => (
    <div className="p-6">
      <ThemeToggle />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    const pressed = button.getAttribute("aria-pressed");
    await userEvent.click(button);
    await waitFor(() =>
      expect(button).toHaveAttribute("aria-pressed", pressed === "true" ? "false" : "true"),
    );
  },
};
export const MobileHeader: StoryObj = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: () => <SiteHeader />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Otvori meni" }));
    const navigation = canvas.getByRole("navigation", { name: "Mobilna navigacija" });
    await waitFor(() => expect(navigation).toBeVisible());
    await userEvent.click(within(navigation).getByRole("link", { name: "Kontakt" }));
    await expect(canvas.getByRole("button", { name: "Otvori meni" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  },
};
