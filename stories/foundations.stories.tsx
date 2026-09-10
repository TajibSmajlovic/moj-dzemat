import type { Meta, StoryObj } from "@storybook/react-vite";

import { FacebookIcon } from "#app/components/icons/facebook-icon";
import { IslamskaZajednicaLogo } from "#app/components/icons/islamska-zajednica-logo";
import { YouTubeIcon } from "#app/components/icons/youtube-icon";
const meta = {
  title: "Foundations",
  parameters: {
    docs: {
      description: {
        component:
          "The app stylesheet is the source of truth. Inter is the interface face; Lora is the display face. Use semantic color tokens and inspect both themes.",
      },
    },
  },
} satisfies Meta;
export default meta;
export const Colors: StoryObj = {
  render: () => (
    <div className="grid max-w-4xl gap-4 sm:grid-cols-3">
      {["background", "card", "primary", "secondary", "muted", "accent", "destructive"].map(
        (token) => (
          <div key={token} className="border-border overflow-hidden rounded-xl border">
            <div className="h-24" style={{ background: `hsl(var(--${token}))` }} />
            <p className="bg-card p-3 font-mono text-sm">{token}</p>
          </div>
        ),
      )}
    </div>
  ),
};
export const Typography: StoryObj = {
  render: () => (
    <article className="max-w-2xl space-y-6">
      <h1 className="font-display text-4xl font-bold">Zajedno gradimo zajednicu</h1>
      <h2 className="font-display text-2xl font-semibold">Poziv na razgovor i druženje</h2>
      <p className="text-base leading-7">
        Naš džemat je mjesto susreta, podrške i učenja. Ovdje svako može pronaći način da doprinese
        zajednici.
      </p>
      <p className="text-muted-foreground text-sm">
        Mala napomena: svi podaci u primjerima su izmišljeni.
      </p>
      <p>Č Ć Ž Š Đ / č ć ž š đ / 0123456789</p>
    </article>
  ),
};
export const ShapeAndSpacing: StoryObj = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      {[
        ["rounded-md", "shadow-xs", "p-3"],
        ["rounded-xl", "shadow-sm", "p-5"],
        ["rounded-2xl", "shadow-lg", "p-8"],
      ].map(([radius, shadow, padding]) => (
        <div key={radius} className={`border-border bg-card border ${radius} ${shadow} ${padding}`}>
          <p className="font-mono text-sm">{radius}</p>
          <p className="text-muted-foreground text-xs">
            {shadow} / {padding}
          </p>
        </div>
      ))}
    </div>
  ),
};
export const Icons: StoryObj = {
  render: () => (
    <div className="text-primary flex items-center gap-8">
      <FacebookIcon className="size-8" />
      <YouTubeIcon className="size-8" />
      <IslamskaZajednicaLogo className="size-16" />
    </div>
  ),
};
