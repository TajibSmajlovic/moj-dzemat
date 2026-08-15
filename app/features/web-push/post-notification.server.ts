import type { Prisma } from "#generated/prisma/client";
import { randomUUID } from "node:crypto";

import { postNotificationResolverHref } from "#app/features/posts/post-routes";
import { DAY_MS } from "#app/lib/time";
import { env } from "#app/server/env.server";

export type PublicationDecision =
  "not-applicable" | "queued" | "no-subscribers" | "skipped" | "existing";

type PublicationPost = {
  id: string;
  title: string;
  notifyOnPublish: boolean;
};

export async function recordFirstPublicationDecision(
  tx: Prisma.TransactionClient,
  post: PublicationPost,
  now: Date,
): Promise<PublicationDecision> {
  const environment = env();
  const skipReason = environment.WEB_PUSH_ENABLED
    ? post.notifyOnPublish
      ? null
      : "notification_not_requested"
    : "feature_disabled";
  const queued = skipReason === null;
  const markerId = randomUUID();

  const marker = await tx.postNotification.upsert({
    where: { postId: post.id },
    update: {},
    create: {
      id: markerId,
      postId: post.id,
      status: queued ? "pending" : "skipped",
      skipReason,
      titleSnapshot: post.title,
      resolverPathSnapshot: postNotificationResolverHref(post.id),
      deadlineAt: new Date(now.getTime() + DAY_MS),
    },
    select: { id: true },
  });
  if (marker.id !== markerId) return "existing";
  if (!queued) return "skipped";

  const deliveryCount = await tx.$executeRaw`
    INSERT INTO "PushDelivery" (
      "notificationId",
      "subscriptionId",
      "endpointHashSnapshot",
      "nextAttemptAt",
      "createdAt",
      "updatedAt"
    )
    SELECT
      ${marker.id},
      "id",
      "endpointHash",
      ${now},
      ${now},
      ${now}
    FROM "PushSubscription"
    WHERE "expiresAt" IS NULL OR "expiresAt" > ${now}
  `;

  if (deliveryCount === 0) {
    await tx.postNotification.update({
      where: { id: marker.id },
      data: { status: "completed", completedAt: now },
    });

    return "no-subscribers";
  }

  return "queued";
}

export async function cancelPostNotificationWork(
  tx: Prisma.TransactionClient,
  postId: string,
  now: Date,
): Promise<void> {
  const notification = await tx.postNotification.findUnique({
    where: { postId },
    select: { id: true, status: true },
  });
  if (notification?.status !== "pending") return;

  await tx.pushDelivery.updateMany({
    where: { notificationId: notification.id, status: { in: ["pending", "sending", "retry"] } },
    data: {
      status: "cancelled",
      resultCode: "cancelled",
      cancelledAt: now,
      leaseOwner: null,
      leaseExpiresAt: null,
    },
  });
  await tx.postNotification.updateMany({
    where: { id: notification.id, status: "pending" },
    data: {
      status: "cancelled",
      cancelledAt: now,
    },
  });
}
