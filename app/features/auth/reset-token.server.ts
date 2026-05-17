import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { PASSWORD_RESET_TOKEN_TTL_SECONDS } from "#app/features/auth/auth-policy";
import { prisma } from "#app/server/db.server";
import { env } from "#app/server/env.server";

/**
   Stateless password-reset tokens. We intentionally avoid a
   `Verification` table - the only flow that needs verification in
   moj-dzemat is forgot-password, and a signed URL captures everything
   we need: user id, expiry, and the current password row version so
   that changing the password revokes every still-live link.

   Structure:
     payload: { sub: userId, pwdv: passwordVersion, iat, exp }
     sig:     HS256 with the current PASSWORD_RESET_SECRET (first csv entry)
     verify:  accept any csv entry so rotation is zero-downtime
 */

const ALG = "HS256";

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function secrets(): { signer: string; verifiers: string[] } {
  const list = env().PASSWORD_RESET_SECRET;
  // list is guaranteed non-empty by the env schema.
  const [first, ...rest] = list;
  return { signer: first!, verifiers: [first!, ...rest] };
}

type ResetPayload = JWTPayload & { pwdv: string };

function passwordVersion(updatedAt: Date | null): string {
  return updatedAt?.toISOString() ?? "init";
}

export async function signResetToken({
  userId,
  passwordUpdatedAt,
}: {
  userId: string;
  passwordUpdatedAt: Date | null;
}): Promise<string> {
  const { signer } = secrets();

  return new SignJWT({ pwdv: passwordVersion(passwordUpdatedAt) })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${PASSWORD_RESET_TOKEN_TTL_SECONDS}s`)
    .sign(encodeSecret(signer));
}

type VerifyResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" | "superseded" | "unknown-user" };

export async function verifyResetToken(token: string): Promise<VerifyResult> {
  const { verifiers } = secrets();

  let payload: ResetPayload | undefined;
  let expired = false;
  for (const secret of verifiers) {
    try {
      const result = await jwtVerify<ResetPayload>(token, encodeSecret(secret), {
        algorithms: [ALG],
      });
      payload = result.payload;
      break;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ERR_JWT_EXPIRED"
      ) {
        expired = true;
      }
      // Try the next verifier (rotation case).
    }
  }

  if (!payload) return { ok: false, reason: expired ? "expired" : "invalid" };

  const userId = payload.sub;
  if (typeof userId !== "string") return { ok: false, reason: "invalid" };

  // Jose already rejected expired tokens; the remaining check is the
  // password row version. If the admin has changed their password (or
  // set one for the first time), every older token is dead on arrival.
  const record = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: { select: { updatedAt: true } } },
  });
  if (!record) return { ok: false, reason: "unknown-user" };

  const currentVersion = passwordVersion(record.password?.updatedAt ?? null);
  if (payload.pwdv !== currentVersion) {
    return { ok: false, reason: "superseded" };
  }

  return { ok: true, userId: record.id };
}
