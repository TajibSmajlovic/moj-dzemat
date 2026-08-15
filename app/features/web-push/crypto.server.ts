import { compactDecrypt, CompactEncrypt, decodeProtectedHeader } from "jose";
import { createHash } from "node:crypto";
import { z } from "zod";

import { env } from "#app/server/env.server";

const HASH_VERSION = "v1";
const JWE_TYPE = "moj-dzemat-web-push-subscription+jwe";

const StoredPushSubscriptionSchema = z.object({
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
});

export type StoredPushSubscription = z.infer<typeof StoredPushSubscriptionSchema>;

type KeyEntry = { id: string; key: Buffer };

function encryptionKeys(): KeyEntry[] {
  const configured = env().WEB_PUSH_ENCRYPTION_KEYS;
  if (!configured) throw new Error("Web Push encryption keys are unavailable");

  return configured.split(",").map((encoded) => {
    const key = Buffer.from(encoded.trim(), "base64url");
    return { id: createHash("sha256").update(key).digest("base64url").slice(0, 12), key };
  });
}

export function endpointHash(endpoint: string): string {
  return `${HASH_VERSION}:${createHash("sha256").update(endpoint).digest("base64url")}`;
}

export function isVersionedEndpointHash(value: unknown): value is string {
  return typeof value === "string" && /^v1:[A-Za-z0-9_-]{43}$/.test(value);
}

export async function encryptSubscription(subscription: StoredPushSubscription): Promise<string> {
  const primary = encryptionKeys()[0];
  if (!primary) throw new Error("A primary Web Push encryption key is required");

  return new CompactEncrypt(Buffer.from(JSON.stringify(subscription), "utf8"))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", kid: primary.id, typ: JWE_TYPE })
    .encrypt(primary.key);
}

export async function decryptSubscription(value: string): Promise<{
  subscription: StoredPushSubscription;
  needsReencryption: boolean;
}> {
  const header = decodeProtectedHeader(value);
  const keys = encryptionKeys();
  const key = keys.find((entry) => entry.id === header.kid);
  if (!key || header.typ !== JWE_TYPE) {
    throw new Error("Unsupported Web Push encryption envelope");
  }

  const { plaintext } = await compactDecrypt(value, key.key, {
    keyManagementAlgorithms: ["dir"],
    contentEncryptionAlgorithms: ["A256GCM"],
  });
  const subscription = StoredPushSubscriptionSchema.parse(
    JSON.parse(Buffer.from(plaintext).toString("utf8")) as unknown,
  );

  return { subscription, needsReencryption: key.id !== keys[0]?.id };
}
