import { dzematConfig } from "#app/dzemat.config";
import type { DzematConfig } from "#app/lib/dzemat-config";

/** The džemat this deployment serves, configured in `app/dzemat.config.ts`. */
export const dzemat: DzematConfig = dzematConfig;

/** Product name shared by every džemat deployment. */
export const PRODUCT_NAME = "Moj Džemat";

export const SITE_NAME = `${PRODUCT_NAME} - ${dzemat.name}`;

export const SITE_DESCRIPTION = `Zvanična stranica džemata ${dzemat.name} za aktuelne obavijesti, hutbe, sergije, smrtovnice i priče.`;

export function formatPageTitle(pageTitle: string): string {
  return `${pageTitle} — ${SITE_NAME}`;
}
