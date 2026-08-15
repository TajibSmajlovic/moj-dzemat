-- AlterTable
ALTER TABLE "Post" ADD COLUMN "notifyOnPublish" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "endpointHash" TEXT NOT NULL,
    "encryptedSubscription" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PostNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "skipReason" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "resolverPathSnapshot" TEXT NOT NULL,
    "deadlineAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "expiredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PushDelivery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notificationId" TEXT NOT NULL,
    "subscriptionId" INTEGER,
    "endpointHashSnapshot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseOwner" TEXT,
    "leaseExpiresAt" DATETIME,
    "lastHttpStatus" INTEGER,
    "resultCode" TEXT,
    "sentAt" DATETIME,
    "failedAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PushDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "PostNotification" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PushDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PushSubscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Preserve the first-publication invariant for every post that predates Web Push.
INSERT INTO "PostNotification" (
    "id",
    "postId",
    "status",
    "skipReason",
    "titleSnapshot",
    "resolverPathSnapshot",
    "deadlineAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'before-web-push:' || "id",
    "id",
    'skipped',
    'before_web_push',
    "title",
    '/objave/otvori/' || "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Post";

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpointHash_key" ON "PushSubscription"("endpointHash");
CREATE INDEX "PushSubscription_expiresAt_idx" ON "PushSubscription"("expiresAt");
CREATE UNIQUE INDEX "PostNotification_postId_key" ON "PostNotification"("postId");
CREATE INDEX "PostNotification_status_deadlineAt_idx" ON "PostNotification"("status", "deadlineAt");
CREATE UNIQUE INDEX "PushDelivery_notificationId_endpointHashSnapshot_key" ON "PushDelivery"("notificationId", "endpointHashSnapshot");
CREATE INDEX "PushDelivery_status_nextAttemptAt_idx" ON "PushDelivery"("status", "nextAttemptAt");
CREATE INDEX "PushDelivery_status_leaseExpiresAt_idx" ON "PushDelivery"("status", "leaseExpiresAt");
CREATE INDEX "PushDelivery_subscriptionId_idx" ON "PushDelivery"("subscriptionId");
