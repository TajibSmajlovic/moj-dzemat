import { ROUTES } from "#app/lib/routes";

export function passwordResetHref(token: string): string {
  return `${ROUTES.newPassword}/${token}`;
}
