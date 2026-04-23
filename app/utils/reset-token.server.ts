import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { passwordFingerprint } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { env } from "#app/utils/env.server";

/**
 * Stateless password-reset tokens. We intentionally avoid a
 * `Verification` table - the only flow that needs verification in
 * moj-dzemat is forgot-password, and a signed URL captures everything
 * we need: user id, expiry, and a fingerprint of the current password
 * hash so that changing the password revokes every still-live link.
 *
 * Structure:
 *   payload: { sub: userId, pwfp: passwordFingerprint, iat, exp }
 *   sig:     HS256 with the current PASSWORD_RESET_SECRET (first csv entry)
 *   verify:  accept any csv entry so rotation is zero-downtime
 */

const TTL_SECONDS = 60 * 60; // 1 hour
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

type ResetPayload = JWTPayload & { pwfp: string };

export async function signResetToken({
  userId,
  passwordHash,
}: {
  userId: string;
  passwordHash: string | null;
}): Promise<string> {
  const { signer } = secrets();
  return new SignJWT({ pwfp: passwordFingerprint(passwordHash) })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
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
  // password fingerprint. If the admin has changed their password (or
  // set one for the first time), every older token is dead on arrival.
  const record = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: { select: { hash: true } } },
  });
  if (!record) return { ok: false, reason: "unknown-user" };

  const currentFingerprint = passwordFingerprint(record.password?.hash ?? null);
  if (payload.pwfp !== currentFingerprint) {
    return { ok: false, reason: "superseded" };
  }

  return { ok: true, userId: record.id };
}
