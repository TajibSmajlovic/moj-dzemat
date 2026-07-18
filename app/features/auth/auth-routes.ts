import { href } from "react-router";

/** Product policy: the default destination after successful authentication. */
export const DEFAULT_LOGGED_IN_REDIRECT = href("/admin/objave");

export function passwordResetHref(token: string): string {
  return href("/nova-lozinka/:token", { token });
}
