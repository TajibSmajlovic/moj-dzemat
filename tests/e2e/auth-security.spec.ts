import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";

import { prisma } from "../../app/server/db.server";
import { createUser } from "../factories";
import { openPasswordResetViaDevInbox, resetPasswordViaDevInbox } from "./utils/reset-password";

test.afterAll(async () => {
  await prisma.$disconnect();
});

for (const password of ["existing-password-123", null]) {
  test(`only one reset request succeeds for ${password === null ? "a passwordless" : "an existing"} account`, async ({
    page,
  }) => {
    const { user } = await createUser({ password });
    try {
      await openPasswordResetViaDevInbox(page, user.email);
      const url = page.url();
      const fields = await page
        .locator("form")
        .evaluate((form) => Object.fromEntries(new FormData(form as HTMLFormElement)));
      const values = ["ConcurrentPasswordAlpha123!", "ConcurrentPasswordBeta123!"];
      const submit = (value: string) =>
        fetch(url, {
          method: "POST",
          redirect: "manual",
          body: new URLSearchParams({
            ...fields,
            password: value,
            confirmPassword: value,
          }),
        });
      const responses = await Promise.all(values.map((value) => submit(value)));
      expect(responses.map((response) => response.status)).toEqual(
        expect.arrayContaining([302, 400]),
      );
      const winner = responses.findIndex((response) => response.status === 302);
      const row = await prisma.password.findUniqueOrThrow({ where: { userId: user.id } });
      expect(await bcrypt.compare(values[winner]!, row.hash)).toBe(true);
      expect(await bcrypt.compare(values[1 - winner]!, row.hash)).toBe(false);
      const replay = await submit("SequentialReplay123!");
      expect(replay.status).toBe(400);
      const cookie = responses[winner]!.headers.getSetCookie().at(-1)!.split(";")[0]!;
      const admin = await page.request.get("/admin/objave", {
        headers: { Cookie: cookie },
        maxRedirects: 0,
      });
      expect(admin.status()).toBe(200);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
}

test("legacy long-password users can log in and reset to a password within the byte limit", async ({
  page,
}) => {
  const legacy = "LegacyCredential123!".repeat(5);
  const { user } = await createUser({ password: null });
  try {
    await prisma.password.create({ data: { userId: user.id, hash: await bcrypt.hash(legacy, 4) } });
    await page.goto("/prijava");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Lozinka").fill(legacy);
    await page.getByRole("button", { name: "Prijavi se" }).click();
    await expect(page).toHaveURL(/\/admin\/objave$/);
    await page.context().clearCookies();
    await openPasswordResetViaDevInbox(page, user.email);
    for (const value of ["a".repeat(73), "č".repeat(37), "🔐".repeat(19)]) {
      await page.getByLabel("Nova lozinka").fill(value);
      await page.getByLabel("Potvrdite lozinku").fill(value);
      await page.getByRole("button", { name: "Sačuvaj i prijavi se" }).click();
      await expect(page.locator("form")).toContainText("Lozinka može imati najviše 72 bajta.");
      await expect(page).toHaveURL(/\/nova-lozinka\//);
      const row = await prisma.password.findUniqueOrThrow({ where: { userId: user.id } });
      expect(await bcrypt.compare(legacy, row.hash)).toBe(true);
    }
    const boundary = "č".repeat(35) + "X9";
    await resetPasswordViaDevInbox(page, { email: user.email, newPassword: boundary });
    await expect(page).toHaveURL(/\/admin\/objave$/);
    await page.context().clearCookies();
    await page.goto("/prijava");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Lozinka").fill(boundary);
    await page.getByRole("button", { name: "Prijavi se" }).click();
    await expect(page).toHaveURL(/\/admin\/objave$/);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});
