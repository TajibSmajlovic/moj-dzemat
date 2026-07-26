import { href } from "react-router";

import { beforeEach, describe, expect, it } from "vitest";

import {
  COMMUNITY_INFO_ID,
  getCommunityInfo,
  invalidateCommunityInfo,
} from "#app/features/contact/contact.server";
import { action as contactAction, loader as contactLoader } from "#app/routes/admin.kontakt";
import { prisma } from "#app/server/db.server";

import { createCommunityInfo } from "../../factories";
import { expectData, statusOf } from "../../helpers/action-result";
import { createAdminSession, type AdminRouteContext } from "../../helpers/auth";
import { callAction as runAction, callLoader as runLoader, testUrl } from "../../helpers/route";

const ENDPOINT = testUrl(href("/admin/kontakt"));

const callAction = (formData: FormData, context: AdminRouteContext) =>
  runAction(contactAction, { url: ENDPOINT, formData, context });

const callLoader = (context: AdminRouteContext) =>
  runLoader(contactLoader, { url: ENDPOINT, context });

describe("community contact admin route", () => {
  let context: AdminRouteContext;

  beforeEach(async () => {
    ({ context } = await createAdminSession());
    invalidateCommunityInfo();
  });

  describe("loader", () => {
    it("returns the saved singleton row", async () => {
      await createCommunityInfo({
        contactPhone: "+38760000000",
        aboutText: "O našem džematu",
      });

      const result = expectData(await callLoader(context));

      expect(result.info.contactPhone).toBe("+38760000000");
      expect(result.info.aboutText).toBe("O našem džematu");
    });
  });

  describe("save", () => {
    it("creates the singleton row and invalidates the public cache", async () => {
      const cachedBeforeSave = await getCommunityInfo();
      expect(cachedBeforeSave.aboutText).toBeNull();

      const formData = new FormData();
      formData.set("intent", "save");
      formData.set("showAbout", "on");
      formData.set("showContact", "on");
      formData.set("showImam", "on");
      formData.set("showBoard", "on");
      formData.set("showBank", "on");
      formData.set("showLocation", "on");
      formData.set("aboutText", "Novi opis džemata");
      formData.set("contactPhone", "+38761122334");
      formData.set("contactEmail", "info@dzemat.ba");
      formData.set("bankAccount", "BA39 1290 0794 0102 8494");
      formData.set("bankBeneficiary", "Džemat Test");

      const result = await callAction(formData, context);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(302);

      const row = await prisma.communityInfo.findUnique({ where: { id: COMMUNITY_INFO_ID } });
      expect(row?.aboutText).toBe("Novi opis džemata");
      expect(row?.contactPhone).toBe("+38761122334");
      expect(row?.contactEmail).toBe("info@dzemat.ba");
      expect(row?.bankAccount).toBe("BA391290079401028494");
      expect(row?.showContact).toBe(true);

      const cached = await getCommunityInfo();
      expect(cached.aboutText).toBe("Novi opis džemata");
    });

    it("updates an existing row in place", async () => {
      await createCommunityInfo({ contactPhone: "+38760000000" });

      const formData = new FormData();
      formData.set("intent", "save");
      formData.set("showContact", "on");
      formData.set("showImam", "on");
      formData.set("contactPhone", "+38769999888");
      formData.set("imamName", "Hfz. Novi Imam");

      const result = await callAction(formData, context);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(302);

      const rows = await prisma.communityInfo.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.contactPhone).toBe("+38769999888");
      expect(rows[0]?.imamName).toBe("Hfz. Novi Imam");
      expect(rows[0]?.showImam).toBe(true);
      expect(rows[0]?.showBank).toBe(false);
    });

    it("rejects invalid email input", async () => {
      const formData = new FormData();
      formData.set("intent", "save");
      formData.set("contactEmail", "nije-email");

      const result = await callAction(formData, context);
      expect(statusOf(result)).toBe(400);
    });
  });
});
