import { randomUUID } from "node:crypto";

import { sendWebPushDeliveryBatch } from "#app/features/web-push/delivery.server";
import { DAY_MS, SECOND_MS } from "#app/lib/time";
import { prisma } from "#app/server/db.server";
import { env } from "#app/server/env.server";
import { logger } from "#app/server/logger.server";

const NORMAL_KICK_COOLDOWN_MS = 30 * SECOND_MS;
const WORK_BUDGET_MS = 10 * SECOND_MS;
const MIN_OUTBOUND_REMAINING_MS = 6 * SECOND_MS;
const TERMINAL_DELIVERY_STATUSES = ["sent", "failed", "cancelled"] as const;

let activeRun: Promise<void> | null = null;
let lastNormalKickAt = 0;
let rerunRequested = false;

export function kickWebPushDispatcher(options: { bypassCooldown?: boolean } = {}): void {
  const now = Date.now();
  if (!options.bypassCooldown && now - lastNormalKickAt < NORMAL_KICK_COOLDOWN_MS) return;
  if (!options.bypassCooldown) lastNormalKickAt = now;
  if (activeRun) {
    if (options.bypassCooldown) rerunRequested = true;
    return;
  }

  activeRun = runDispatcher()
    .catch((error: unknown) => {
      logger.error(
        { errorType: error instanceof Error ? error.name : "unknown" },
        "web push dispatcher failed",
      );
    })
    .finally(() => {
      activeRun = null;
      if (rerunRequested) {
        rerunRequested = false;
        kickWebPushDispatcher({ bypassCooldown: true });
      }
    });
}

async function runDispatcher(): Promise<void> {
  const startedAt = Date.now();
  const owner = randomUUID();

  await runMaintenance(new Date());

  if (!env().WEB_PUSH_ENABLED) return;

  while (Date.now() - startedAt < WORK_BUDGET_MS) {
    await completeFinishedNotifications(new Date());
    if (WORK_BUDGET_MS - (Date.now() - startedAt) <= MIN_OUTBOUND_REMAINING_MS) return;

    const result = await sendWebPushDeliveryBatch(owner, new Date());
    await completeFinishedNotifications(new Date());
    if (!result.progressed || result.fatalVapid) return;
  }
}

async function runMaintenance(now: Date): Promise<void> {
  const expired = await prisma.postNotification.findMany({
    where: { status: "pending", deadlineAt: { lte: now } },
    select: { id: true },
    take: 20,
  });
  if (expired.length > 0) {
    const ids = expired.map(({ id }) => id);
    await prisma.$transaction([
      prisma.pushDelivery.updateMany({
        where: { notificationId: { in: ids }, status: { in: ["pending", "sending", "retry"] } },
        data: {
          status: "failed",
          resultCode: "expired",
          failedAt: now,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      }),
      prisma.postNotification.updateMany({
        where: { id: { in: ids }, status: "pending" },
        data: { status: "expired", expiredAt: now },
      }),
    ]);
  }

  const retentionCutoff = new Date(now.getTime() - 30 * DAY_MS);
  const oldDeliveries = await prisma.pushDelivery.findMany({
    where: {
      status: { in: [...TERMINAL_DELIVERY_STATUSES] },
      updatedAt: { lt: retentionCutoff },
    },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
    take: 100,
  });
  if (oldDeliveries.length > 0) {
    await prisma.pushDelivery.deleteMany({
      where: { id: { in: oldDeliveries.map(({ id }) => id) } },
    });
  }

  await prisma.pushSubscription.deleteMany({ where: { expiresAt: { lte: now } } });
}

async function completeFinishedNotifications(now: Date): Promise<void> {
  const candidates = await prisma.postNotification.findMany({
    where: { status: "pending" },
    select: { id: true },
    take: 20,
  });
  for (const notification of candidates) {
    const remaining = await prisma.pushDelivery.count({
      where: { notificationId: notification.id, status: { in: ["pending", "sending", "retry"] } },
    });
    if (remaining === 0) {
      await prisma.postNotification.updateMany({
        where: { id: notification.id, status: "pending" },
        data: { status: "completed", completedAt: now },
      });
    }
  }
}
