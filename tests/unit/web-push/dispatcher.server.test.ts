import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendBatch: vi.fn(),
  findNotifications: vi.fn(),
  findDeliveries: vi.fn(),
  deleteDeliveries: vi.fn(),
  deleteSubscriptions: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("#app/features/web-push/delivery.server", () => ({
  sendWebPushDeliveryBatch: mocks.sendBatch,
}));
vi.mock("#app/server/db.server", () => ({
  prisma: {
    postNotification: {
      findMany: mocks.findNotifications,
      updateMany: vi.fn(),
    },
    pushDelivery: {
      findMany: mocks.findDeliveries,
      deleteMany: mocks.deleteDeliveries,
      updateMany: vi.fn(),
    },
    pushSubscription: { deleteMany: mocks.deleteSubscriptions },
    $transaction: mocks.transaction,
  },
}));
vi.mock("#app/server/env.server", () => ({ env: () => ({ WEB_PUSH_ENABLED: true }) }));
vi.mock("#app/server/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.findNotifications.mockResolvedValue([]);
  mocks.findDeliveries.mockResolvedValue([]);
  mocks.deleteDeliveries.mockResolvedValue({ count: 0 });
  mocks.deleteSubscriptions.mockResolvedValue({ count: 0 });
});

describe("Web Push dispatcher kicks", () => {
  it("runs again when a publication kick arrives during an active run", async () => {
    let finishFirstBatch!: (value: { progressed: boolean; fatalVapid: boolean }) => void;
    const firstBatch = new Promise<{ progressed: boolean; fatalVapid: boolean }>((resolve) => {
      finishFirstBatch = resolve;
    });
    mocks.sendBatch
      .mockReturnValueOnce(firstBatch)
      .mockResolvedValue({ progressed: false, fatalVapid: false });

    const { kickWebPushDispatcher } = await import("#app/features/web-push/dispatcher.server");
    kickWebPushDispatcher({ bypassCooldown: true });
    await vi.waitFor(() => expect(mocks.sendBatch).toHaveBeenCalledTimes(1));

    kickWebPushDispatcher({ bypassCooldown: true });
    finishFirstBatch({ progressed: false, fatalVapid: false });

    await vi.waitFor(() => expect(mocks.sendBatch).toHaveBeenCalledTimes(2));
  });
});
