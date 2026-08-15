import type { Prisma } from "#generated/prisma/client";
import ipaddr from "ipaddr.js";
import { ECDH } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";

import {
  encryptSubscription,
  endpointHash,
  isVersionedEndpointHash,
  type StoredPushSubscription,
} from "#app/features/web-push/crypto.server";
import { prisma } from "#app/server/db.server";

const WEB_PUSH_REQUEST_LIMIT = 16 * 1024;
const DNS_TIMEOUT_MS = 5000;

const BrowserPushSubscriptionSchema = z.object({
  endpoint: z.string(),
  expirationTime: z.number().nullable(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export type BrowserPushSubscription = StoredPushSubscription & {
  expirationTime: number | null;
};

export type ResolvedPublicAddress = { address: string; family: 4 | 6 };
export type AddressResolver = (hostname: string) => Promise<ResolvedPublicAddress[]>;

export class PushEndpointResolutionError extends Error {
  override name = "PushEndpointResolutionError";
}

export const resolveAddresses: AddressResolver = async (hostname) => {
  const normalizedHostname = hostname.replace(/^\[/, "").replace(/\]$/, "");
  const literalFamily = isIP(normalizedHostname);
  if (literalFamily === 4 || literalFamily === 6) {
    return [{ address: normalizedHostname, family: literalFamily }];
  }

  const results = await dnsLookup(normalizedHostname, { all: true, verbatim: true });
  return results.map(({ address, family }) => ({ address, family: family === 6 ? 6 : 4 }));
};

export async function validateAndResolveEndpoint(
  endpoint: string,
  resolver: AddressResolver = resolveAddresses,
): Promise<{ url: URL; addresses: ResolvedPublicAddress[] }> {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Response("Neispravna adresa pretplate.", { status: 400 });
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port && url.port !== "443")
  ) {
    throw new Response("Neispravna adresa pretplate.", { status: 400 });
  }

  let addresses: ResolvedPublicAddress[];
  try {
    addresses = await withTimeout(resolver(url.hostname), DNS_TIMEOUT_MS);
  } catch {
    throw new PushEndpointResolutionError("Push endpoint DNS resolution failed");
  }
  if (addresses.length === 0) {
    throw new PushEndpointResolutionError("Push endpoint DNS returned no addresses");
  }
  if (addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new Response("Adresa pretplate nije dostupna.", { status: 400 });
  }

  return { url, addresses };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("DNS lookup timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function isPublicIpAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  return ipaddr.process(address).range() === "unicast";
}

export function parseBrowserSubscription(
  value: unknown,
  now = new Date(),
): BrowserPushSubscription {
  const parsed = BrowserPushSubscriptionSchema.safeParse(value);
  if (!parsed.success) {
    throw new Response("Neispravna pretplata.", { status: 400 });
  }
  const { endpoint, expirationTime, keys } = parsed.data;
  const { p256dh, auth } = keys;
  if (!isValidP256PublicKey(p256dh)) {
    throw new Response("Neispravan ključ pretplate.", { status: 400 });
  }
  if (!isUnpaddedBase64UrlOfLength(auth, 16)) {
    throw new Response("Neispravan ključ pretplate.", { status: 400 });
  }
  if (
    expirationTime !== null &&
    (!Number.isFinite(expirationTime) || expirationTime <= now.getTime())
  ) {
    throw new Response("Pretplata je istekla.", { status: 400 });
  }

  return { endpoint, p256dh, auth, expirationTime };
}

function isValidP256PublicKey(value: string): boolean {
  if (!isUnpaddedBase64UrlOfLength(value, 65)) return false;

  const key = Buffer.from(value, "base64url");
  if (key[0] !== 4) return false;

  try {
    ECDH.convertKey(key, "prime256v1");
    return true;
  } catch {
    return false;
  }
}

function isUnpaddedBase64UrlOfLength(value: string, byteLength: number): boolean {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return false;
  const decoded = Buffer.from(value, "base64url");
  return decoded.length === byteLength && decoded.toString("base64url") === value;
}

export async function readLimitedJson(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !==
    "application/json"
  ) {
    throw new Response("Očekivan je JSON zahtjev.", { status: 415 });
  }
  if (!request.body) throw new Response("Tijelo zahtjeva je obavezno.", { status: 400 });

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > WEB_PUSH_REQUEST_LIMIT) {
      await reader.cancel();
      throw new Response("Zahtjev je prevelik.", { status: 413 });
    }
    chunks.push(value);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new Response("Neispravan JSON zahtjev.", { status: 400 });
  }
}

export function requireExactOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new Response("Neispravno porijeklo zahtjeva.", { status: 403 });
  }
}

export async function upsertPushSubscription(
  input: BrowserPushSubscription,
  resolver: AddressResolver = resolveAddresses,
) {
  try {
    await validateAndResolveEndpoint(input.endpoint, resolver);
  } catch (error) {
    if (error instanceof PushEndpointResolutionError) {
      throw new Response("Adresa pretplate nije dostupna.", { status: 400 });
    }
    throw error;
  }
  const hash = endpointHash(input.endpoint);
  const encryptedSubscription = await encryptSubscription({
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
  });
  const expiresAt = input.expirationTime === null ? null : new Date(input.expirationTime);

  const record = await prisma.pushSubscription.upsert({
    where: { endpointHash: hash },
    create: { endpointHash: hash, encryptedSubscription, expiresAt },
    update: { encryptedSubscription, expiresAt },
    select: { id: true, endpointHash: true, createdAt: true },
  });

  return record;
}

export async function deletePushSubscription(hash: unknown): Promise<void> {
  if (!isVersionedEndpointHash(hash)) {
    throw new Response("Neispravan identifikator pretplate.", { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    const subscription = await tx.pushSubscription.findUnique({
      where: { endpointHash: hash },
      select: { id: true },
    });
    if (!subscription) return;

    await cancelSubscriptionDeliveries(tx, subscription.id, new Date());
    await tx.pushSubscription.delete({ where: { id: subscription.id } });
  });
}

async function cancelSubscriptionDeliveries(
  tx: Prisma.TransactionClient,
  subscriptionId: number,
  now: Date,
): Promise<void> {
  await tx.pushDelivery.updateMany({
    where: {
      subscriptionId,
      status: { in: ["pending", "sending", "retry"] },
    },
    data: {
      status: "cancelled",
      resultCode: "cancelled",
      cancelledAt: now,
      leaseOwner: null,
      leaseExpiresAt: null,
    },
  });
}
