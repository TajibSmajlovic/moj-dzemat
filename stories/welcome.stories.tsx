import type { Meta, StoryObj } from "@storybook/react-vite";

import { IslamskaZajednicaLogo } from "#app/components/icons/islamska-zajednica-logo";
const meta = {
  title: "Welcome",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A public catalogue of the real Moj Džemat UI. English documentation accompanies Bosnian examples. All records and media are fictional.",
      },
    },
  },
} satisfies Meta;
export default meta;
export const Catalogue: StoryObj = {
  render: () => (
    <main className="mx-auto max-w-5xl px-6 py-14 sm:px-12">
      <div className="text-primary mb-10 w-16">
        <IslamskaZajednicaLogo />
      </div>
      <p className="text-muted-foreground mb-3 text-sm tracking-widest uppercase">
        Moj Džemat / Komponente
      </p>
      <h1 className="font-display mb-5 text-4xl leading-tight sm:text-6xl">
        Naša zajednica,
        <br />
        dio po dio.
      </h1>
      <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
        Katalog stvarnih komponenti aplikacije. Istražite izgled, stanja i ponašanje javnih stranica
        i administracije.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          [
            "Explore",
            "Browse foundations, UI, forms, public pages and admin components in the sidebar.",
          ],
          [
            "Try a state",
            "Use Controls, the theme menu and viewport toolbar. Forms and browser effects are simulated.",
          ],
          ["Share", "Copy the story URL for a specific component and state. No login is needed."],
        ].map(([title, text]) => (
          <section key={title} className="border-border bg-card rounded-2xl border p-5">
            <h2 className="font-display mb-3 text-xl font-semibold">{title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
          </section>
        ))}
      </div>
      <p className="text-muted-foreground mt-8 text-sm">
        Svi podaci su izmišljeni. Primjeri ne mijenjaju podatke, postavke teme ili pretplate na
        glavnoj stranici.
      </p>
    </main>
  ),
};
