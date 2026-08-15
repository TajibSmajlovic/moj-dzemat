import type { Prisma } from "#generated/prisma/client";
import type { LookupOptions } from "node:dns";
import https from "node:https";
import type { LookupFunction } from "node:net";
import webPush from "web-push";

import {
  decryptSubscription,
  encryptSubscription,
  type StoredPushSubscription,
} from "#app/features/web-push/crypto.server";
import {
  PushEndpointResolutionError,
  resolveAddresses,
  validateAndResolveEndpoint,
  type ResolvedPublicAddress,
} from "#app/features/web-push/subscription.server";
import { HOUR_MS, MINUTE_MS, SECOND_MS } from "#app/lib/time";
import { prisma } from "#app/server/db.server";
import { env } from "#app/server/env.server";
import { logger } from "#app/server/logger.server";

const OUTBOUND_TIMEOUT_MS = 5 * SECOND_MS;
const DELIVERY_BATCH_SIZE = 5;
const LEASE_MS = 30 * SECOND_MS;
const RETRY_DELAYS_MS = [MINUTE_MS, 5 * MINUTE_MS, 30 * MINUTE_MS, 2 * HOUR_MS, 12 * HOUR_MS];

export async function sendWebPushDeliveryBatch(
  owner: string,
  now: Date,
): Promise<{ progressed: boolean; fatalVapid: boolean }> {
  const due = await prisma.pushDelivery.findMany({
    where: {
      OR: [
        { status: { in: ["pending", "retry"] }, nextAttemptAt: { lte: now } },
        { status: "sending", leaseExpiresAt: { lte: now } },
      ],
    },
    select: { id: true },
    orderBy: { nextAttemptAt: "asc" },
    take: DELIVERY_BATCH_SIZE,
  });

  if (due.length === 0) return { progressed: false, fatalVapid: false };

  const leaseExpiresAt = new Date(now.getTime() + LEASE_MS);
  const claimedIds: number[] = [];

  for (const delivery of due) {
    const claimed = await prisma.pushDelivery.updateMany({
      where: {
        id: delivery.id,
        OR: [
          { status: { in: ["pending", "retry"] }, nextAttemptAt: { lte: now } },
          { status: "sending", leaseExpiresAt: { lte: now } },
        ],
      },
      data: {
        status: "sending",
        attemptCount: { increment: 1 },
        leaseOwner: owner,
        leaseExpiresAt,
      },
    });

    if (claimed.count > 0) claimedIds.push(delivery.id);
  }

  if (claimedIds.length === 0) return { progressed: true, fatalVapid: false };

  const results = await Promise.all(claimedIds.map((id) => sendClaimedDelivery(id, owner, now)));

  return { progressed: true, fatalVapid: results.some((result) => result === "fatal-vapid") };
}

async function sendClaimedDelivery(
  deliveryId: number,
  owner: string,
  now: Date,
): Promise<"done" | "fatal-vapid"> {
  const delivery = await prisma.pushDelivery.findFirst({
    where: { id: deliveryId, status: "sending", leaseOwner: owner },
    include: { notification: true, subscription: true },
  });

  if (!delivery) return "done";

  if (delivery.notification.deadlineAt <= now) {
    await failDelivery(delivery.id, owner, now, "expired", null);

    return "done";
  }

  const post = await prisma.post.findUnique({
    where: { id: delivery.notification.postId },
    select: { status: true },
  });

  if (post?.status !== "published") {
    await prisma.$transaction((tx) => cancelNotification(tx, delivery.notification.id, now));
    return "done";
  }

  if (
    !delivery.subscription ||
    (delivery.subscription.expiresAt && delivery.subscription.expiresAt <= now)
  ) {
    await invalidateSubscription(delivery, owner, now, "invalid_subscription", null);
    return "done";
  }

  let decrypted: Awaited<ReturnType<typeof decryptSubscription>>;
  try {
    decrypted = await decryptSubscription(delivery.subscription.encryptedSubscription);
  } catch {
    await invalidateSubscription(delivery, owner, now, "invalid_subscription", null);
    return "done";
  }

  let endpoint: Awaited<ReturnType<typeof validateAndResolveEndpoint>>;
  try {
    endpoint = await validateAndResolveEndpoint(decrypted.subscription.endpoint, resolveAddresses);
  } catch (error) {
    if (error instanceof PushEndpointResolutionError) {
      await retryOrFail(delivery, owner, now, "network_error", null, null);
      return "done";
    }
    await invalidateSubscription(delivery, owner, now, "invalid_subscription", null);
    return "done";
  }

  if (decrypted.needsReencryption) {
    await prisma.pushSubscription.updateMany({
      where: { id: delivery.subscription.id },
      data: { encryptedSubscription: await encryptSubscription(decrypted.subscription) },
    });
  }

  const ttl = Math.floor((delivery.notification.deadlineAt.getTime() - now.getTime()) / 1000);
  if (ttl <= 0) {
    await failDelivery(delivery.id, owner, now, "expired", null);
    return "done";
  }

  try {
    const response = await sendWebPushRequest({
      subscription: decrypted.subscription,
      address: endpoint.addresses[0]!,
      ttl,
      notification: delivery.notification,
    });
    const status = response.statusCode;
    if (status >= 200 && status < 300) {
      await prisma.pushDelivery.updateMany({
        where: { id: delivery.id, status: "sending", leaseOwner: owner },
        data: {
          status: "sent",
          resultCode: "accepted",
          lastHttpStatus: status,
          sentAt: now,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
      return "done";
    }
    if (status === 404 || status === 410) {
      await invalidateSubscription(delivery, owner, now, "subscription_gone", status);
      return "done";
    }
    if (status === 401 || status === 403) {
      await retryOrFail(delivery, owner, now, "vapid_rejected", status, response.retryAfter);
      logger.warn(
        { deliveryId: delivery.id, statusCode: status },
        "web push VAPID credentials rejected",
      );
      return "fatal-vapid";
    }
    if (status === 400 || status === 413) {
      await failDelivery(
        delivery.id,
        owner,
        now,
        status === 413 ? "payload_too_large" : "invalid_request",
        status,
      );
      return "done";
    }
    if (status === 408 || status === 429 || status >= 500) {
      await retryOrFail(delivery, owner, now, "temporary_response", status, response.retryAfter);
      return "done";
    }

    await failDelivery(delivery.id, owner, now, "invalid_request", status);
  } catch (error) {
    const code =
      error instanceof Error && error.name === "WebPushTimeoutError" ? "timeout" : "network_error";
    await retryOrFail(delivery, owner, now, code, null, null);
  }
  return "done";
}

type DeliveryWithRelations = Prisma.PushDeliveryGetPayload<{
  include: { notification: true; subscription: true };
}>;

async function invalidateSubscription(
  delivery: DeliveryWithRelations,
  owner: string,
  now: Date,
  code: "subscription_gone" | "invalid_subscription",
  status: number | null,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.pushDelivery.updateMany({
      where: { id: delivery.id, status: "sending", leaseOwner: owner },
      data: {
        status: "failed",
        resultCode: code,
        lastHttpStatus: status,
        failedAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
    if (delivery.subscriptionId !== null) {
      await tx.pushDelivery.updateMany({
        where: {
          id: { not: delivery.id },
          subscriptionId: delivery.subscriptionId,
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
      await tx.pushSubscription.deleteMany({ where: { id: delivery.subscriptionId } });
    }
  });
}

async function retryOrFail(
  delivery: DeliveryWithRelations,
  owner: string,
  now: Date,
  code: "timeout" | "network_error" | "temporary_response" | "vapid_rejected",
  status: number | null,
  retryAfter: string | null,
): Promise<void> {
  const fallbackDelay = RETRY_DELAYS_MS[delivery.attemptCount - 1];
  if (fallbackDelay === undefined) {
    await failDelivery(delivery.id, owner, now, code, status);
    return;
  }
  const requestedDelay = status === 429 ? parseRetryAfter(retryAfter, now) : null;
  const delay = requestedDelay ?? fallbackDelay;
  const nextAttemptAt = new Date(
    Math.min(now.getTime() + delay, delivery.notification.deadlineAt.getTime()),
  );
  if (nextAttemptAt >= delivery.notification.deadlineAt) {
    await failDelivery(delivery.id, owner, now, "expired", status);
    return;
  }

  await prisma.pushDelivery.updateMany({
    where: { id: delivery.id, status: "sending", leaseOwner: owner },
    data: {
      status: "retry",
      resultCode: code,
      lastHttpStatus: status,
      nextAttemptAt,
      leaseOwner: null,
      leaseExpiresAt: null,
    },
  });
}

function parseRetryAfter(value: string | null, now: Date): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value) * SECOND_MS;
  const date = Date.parse(value);
  return Number.isFinite(date) && date > now.getTime() ? date - now.getTime() : null;
}

async function failDelivery(
  id: number,
  owner: string,
  now: Date,
  code:
    | "timeout"
    | "network_error"
    | "temporary_response"
    | "invalid_request"
    | "payload_too_large"
    | "vapid_rejected"
    | "expired",
  status: number | null,
): Promise<void> {
  await prisma.pushDelivery.updateMany({
    where: { id, status: "sending", leaseOwner: owner },
    data: {
      status: "failed",
      resultCode: code,
      lastHttpStatus: status,
      failedAt: now,
      leaseOwner: null,
      leaseExpiresAt: null,
    },
  });
}

async function cancelNotification(
  tx: Prisma.TransactionClient,
  id: string,
  now: Date,
): Promise<void> {
  await tx.pushDelivery.updateMany({
    where: { notificationId: id, status: { in: ["pending", "sending", "retry"] } },
    data: {
      status: "cancelled",
      resultCode: "cancelled",
      cancelledAt: now,
      leaseOwner: null,
      leaseExpiresAt: null,
    },
  });
  await tx.postNotification.updateMany({
    where: { id, status: "pending" },
    data: { status: "cancelled", cancelledAt: now },
  });
}

async function sendWebPushRequest({
  subscription,
  address,
  ttl,
  notification,
}: {
  subscription: StoredPushSubscription;
  address: ResolvedPublicAddress;
  ttl: number;
  notification: {
    postId: string;
    titleSnapshot: string;
    resolverPathSnapshot: string;
  };
}): Promise<{ statusCode: number; retryAfter: string | null }> {
  const environment = env();
  const siteName = environment.DZEMAT_NAME?.trim() ?? "Moj Džemat";
  const topic = `md-${Buffer.from(notification.postId).toString("base64url").slice(0, 29)}`;
  const tag = `md-post-${Buffer.from(notification.postId).toString("base64url").slice(0, 32)}`;
  const payload = JSON.stringify({
    v: 1,
    title: `${siteName}: nova objava`.slice(0, 160),
    body: notification.titleSnapshot.slice(0, 240),
    url: notification.resolverPathSnapshot,
    tag,
  });
  const details = webPush.generateRequestDetails(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    payload,
    {
      TTL: Math.min(ttl, 24 * 60 * 60),
      urgency: "normal",
      topic,
      vapidDetails: {
        subject: environment.APP_URL.replace(/^http:/, "https:"),
        publicKey: environment.WEB_PUSH_VAPID_PUBLIC_KEY!,
        privateKey: environment.WEB_PUSH_VAPID_PRIVATE_KEY!,
      },
    },
  );
  const endpointUrl = new URL(details.endpoint);

  return new Promise((resolve, reject) => {
    const request = https.request(
      endpointUrl,
      {
        method: details.method,
        headers: details.headers,
        servername: endpointUrl.hostname,
        lookup: createPinnedAddressLookup(address),
      },
      (response) => {
        resolve({
          statusCode: response.statusCode ?? 0,
          retryAfter:
            typeof response.headers["retry-after"] === "string"
              ? response.headers["retry-after"]
              : null,
        });
        response.destroy();
      },
    );
    const timer = setTimeout(() => {
      const error = new Error("Web Push request timed out");
      error.name = "WebPushTimeoutError";
      request.destroy(error);
    }, OUTBOUND_TIMEOUT_MS);
    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
    if (details.body) request.write(details.body);
    request.end();
  });
}

export function createPinnedAddressLookup(address: ResolvedPublicAddress): LookupFunction {
  return (_hostname, options: LookupOptions, callback) => {
    if (options.all) {
      callback(null, [address]);
      return;
    }

    callback(null, address.address, address.family);
  };
}
