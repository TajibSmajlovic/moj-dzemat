import { describe, expect, it, vi } from "vitest";

import { PWA_CACHE_PREFIX } from "#app/features/pwa/pwa-config";
import {
  performRecoveryCleanup,
  type RecoveryCleanupRuntime,
} from "#app/features/pwa/recovery-cleanup";

type RecoveryCleanupMockRuntime = {
  [Key in keyof RecoveryCleanupRuntime]: ReturnType<typeof vi.fn<RecoveryCleanupRuntime[Key]>>;
};

function runtime(): RecoveryCleanupMockRuntime {
  const listCacheNames = vi
    .fn<RecoveryCleanupRuntime["listCacheNames"]>()
    .mockResolvedValue([`${PWA_CACHE_PREFIX}shell-old`, "another-application-cache"]);
  const deleteCache = vi.fn<RecoveryCleanupRuntime["deleteCache"]>().mockResolvedValue(true);
  const deleteDatabase = vi
    .fn<RecoveryCleanupRuntime["deleteDatabase"]>()
    .mockResolvedValue(undefined);
  const unregister = vi.fn<RecoveryCleanupRuntime["unregister"]>().mockResolvedValue(true);

  return {
    listCacheNames,
    deleteCache,
    deleteDatabase,
    unregister,
  };
}

describe("PWA recovery cleanup", () => {
  it("deletes only PWA-owned caches and unregisters the worker", async () => {
    const cleanupRuntime = runtime();

    await performRecoveryCleanup(cleanupRuntime);

    expect(cleanupRuntime.deleteCache).toHaveBeenCalledOnce();
    expect(cleanupRuntime.deleteCache).toHaveBeenCalledWith(`${PWA_CACHE_PREFIX}shell-old`);
    expect(cleanupRuntime.deleteDatabase).toHaveBeenCalledOnce();
    expect(cleanupRuntime.unregister).toHaveBeenCalledOnce();
  });

  it("still unregisters when cache and database cleanup fail", async () => {
    const cleanupRuntime = runtime();
    cleanupRuntime.listCacheNames.mockRejectedValue(new Error("Cache Storage unavailable"));
    cleanupRuntime.deleteDatabase.mockRejectedValue(new Error("IndexedDB unavailable"));

    await expect(performRecoveryCleanup(cleanupRuntime)).resolves.toBeUndefined();
    expect(cleanupRuntime.unregister).toHaveBeenCalledOnce();
  });

  it("keeps cleanup best-effort when one owned cache cannot be deleted", async () => {
    const cleanupRuntime = runtime();
    cleanupRuntime.listCacheNames.mockResolvedValue([
      `${PWA_CACHE_PREFIX}shell-first`,
      `${PWA_CACHE_PREFIX}shell-second`,
    ]);
    cleanupRuntime.deleteCache
      .mockRejectedValueOnce(new Error("First cache is locked"))
      .mockResolvedValueOnce(true);

    await expect(performRecoveryCleanup(cleanupRuntime)).resolves.toBeUndefined();
    expect(cleanupRuntime.deleteCache).toHaveBeenCalledTimes(2);
    expect(cleanupRuntime.unregister).toHaveBeenCalledOnce();
  });
});
