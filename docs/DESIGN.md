# Design

Moj Džemat uses a warm, institutional visual language that should feel familiar,
calm, and trustworthy. Content is the focus. Decoration supports hierarchy but
must not compete with the information people came to read.

## Visual identity

- Emerald is the primary action and institutional color.
- Gold is a restrained secondary accent, not a competing primary action.
- Cream backgrounds keep public pages warm and readable.
- Dark mode keeps the same emerald, gold, and warm-neutral identity.
- Lora is the display face for headings. Inter is the body and interface face.

The authoritative color, radius, shadow, gradient, and font tokens live in
[`app/styles/tailwind.css`](../app/styles/tailwind.css). Use semantic tokens such
as `primary`, `secondary`, `muted`, `card`, and `destructive`. Do not introduce
one-off colors when an existing token communicates the same meaning.

## Interaction principles

- Design mobile-first. Primary actions must remain reachable without relying on
  hover, wide tables, or desktop-only sidebars.
- Keep public reading paths visually quieter than editing paths.
- Use explicit labels and status text. Color and icons may reinforce meaning but
  must not carry it alone.
- Preserve a clear loading, success, empty, validation, not-found, and failure
  state for every user-visible workflow.
- Prefer progressive enhancement. Sharing, Web Push, PWA storage, view
  transitions, and animation must not block core navigation or reading.
- Respect reduced-motion preferences. Motion should explain continuity, not
  delay a task or hide state changes.

## Composition

- Public content uses the shared page container and readable line lengths.
- Cards use modest borders, radii, and shadows to group content without making
  every item look equally important.
- Admin screens favor predictable forms, tables or lists, status badges, and
  confirmation for destructive actions.
- Reuse primitives from `app/components/ui/`, form building blocks from
  `app/components/forms/`, and layout components from `app/components/layout/`.

The implementation map and component rules live in
[FRONTEND.md](FRONTEND.md).

## Accessibility baseline

- Keep the document language `bs-BA` and write visible copy in natural Bosnian.
- Use semantic landmarks, headings, labels, and native controls before ARIA.
- Every interactive element must be keyboard reachable with a visible focus
  state and an understandable accessible name.
- Maintain contrast in light and dark themes and test states such as muted,
  disabled, destructive, and selected.
- Preserve touch-friendly targets and avoid horizontal page scrolling.
- Announce meaningful validation and action feedback, not decorative changes.

## Visual change validation

For a visible change, run the closest Playwright path and inspect at least one
mobile and one desktop viewport. Check light and dark themes when colors or
tokens change. Check keyboard focus and reduced motion when interaction or
animation changes. Use `npm run test:pwa` for PWA-specific presentation and
offline behavior.
