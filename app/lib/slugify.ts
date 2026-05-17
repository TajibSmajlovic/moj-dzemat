const DIACRITIC_RE = /[\u0300-\u036F]/g;
const NON_SLUG_RE = /[^a-z0-9]+/g;
const EDGE_DASH_RE = /^-+|-+$/g;
const MAX_LENGTH = 80;

/**
   Lowercase-ascii slug. Strips combining accents and handles Bosnian
   ligatures explicitly so "džemat" → "dzemat" and "Čaršija" →
   "carsija". Uniqueness isn't our job - the route's action should
   resolve collisions (append a short suffix or ask the admin to edit).
 */
export function slugify(input: string): string {
  return input
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .normalize("NFKD")
    .replaceAll(DIACRITIC_RE, "")
    .toLowerCase()
    .replaceAll(NON_SLUG_RE, "-")
    .replaceAll(EDGE_DASH_RE, "")
    .slice(0, MAX_LENGTH);
}
