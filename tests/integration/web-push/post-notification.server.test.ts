import { describe, expect, it, vi } from "vitest";

vi.mock("#app/server/env.server", () => ({
  env: () => ({ WEB_PUSH_ENABLED: true }),
}));

import { postNotificationResolverHref } from "#app/features/posts/post-routes";
import { recordFirstPublicationDecision } from "#app/features/web-push/post-publication.server";
import { prisma } from "#app/server/db.server";

describe("first-publication Web Push decision", () => {
  it("completes without reporting queued work when there are no subscribers", async () => {
    const now = new Date("2026-08-09T12:00:00.000Z");
    const post = await prisma.post.create({
      data: {
        title: "Objava bez pretplatnika",
        slug: "objava-bez-pretplatnika",
        type: "obavijest",
        body: "Tekst objave.",
        status: "published",
        notifyOnPublish: true,
      },
    });

    const decision = await prisma.$transaction((tx) =>
      recordFirstPublicationDecision(
        tx,
        { ...post, resolverPath: postNotificationResolverHref(post.id) },
        now,
      ),
    );

    expect(decision).toBe("no-subscribers");
    await expect(
      prisma.postNotification.findUnique({ where: { postId: post.id } }),
    ).resolves.toMatchObject({ status: "completed", completedAt: now });
    await expect(prisma.pushDelivery.count()).resolves.toBe(0);
  });

  it("queues exactly one delivery for an active subscriber", async () => {
    const now = new Date("2026-08-09T12:00:00.000Z");
    const post = await prisma.post.create({
      data: {
        title: "Objava za pretplatnika",
        slug: "objava-za-pretplatnika",
        type: "obavijest",
        body: "Tekst objave.",
        status: "published",
        notifyOnPublish: true,
      },
    });
    const subscription = await prisma.pushSubscription.create({
      data: {
        endpointHash: `v1:${"a".repeat(43)}`,
        encryptedSubscription: "test-envelope",
      },
    });

    const decision = await prisma.$transaction((tx) =>
      recordFirstPublicationDecision(
        tx,
        { ...post, resolverPath: postNotificationResolverHref(post.id) },
        now,
      ),
    );

    expect(decision).toBe("queued");
    await expect(prisma.pushDelivery.findFirst()).resolves.toMatchObject({
      subscriptionId: subscription.id,
      endpointHashSnapshot: subscription.endpointHash,
      status: "pending",
      attemptCount: 0,
    });
  });
});
