/**
 * Shared honeypot constants. Kept outside `*.server.ts` because the
 * form component that renders the hidden fields is client-reachable,
 * and React Router forbids any client module (even type-only) from
 * pulling in a server-only file.
 */
export const HONEYPOT_FIELD = "website__hp";
export const HONEYPOT_TIMESTAMP_FIELD = "website__hp_ts";

export type HoneypotToken = {
  [HONEYPOT_FIELD]: "";
  [HONEYPOT_TIMESTAMP_FIELD]: string;
};
