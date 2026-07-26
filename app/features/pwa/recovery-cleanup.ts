import { selectPwaOwnedCacheNames } from "./worker-routing";

export type RecoveryCleanupRuntime = {
  listCacheNames: () => Promise<string[]>;
  deleteCache: (cacheName: string) => Promise<unknown>;
  deleteDatabase: () => Promise<unknown>;
  unregister: () => Promise<unknown>;
};

/**
   Emergency recovery must relinquish the registration even when browser
   storage is unavailable, corrupted, or blocked by another tab. Start
   unregistration first, then treat every storage operation as best-effort.
 */
export async function performRecoveryCleanup(runtime: RecoveryCleanupRuntime): Promise<void> {
  const unregisterPromise = runBestEffort(runtime.unregister);
  const databaseCleanupPromise = runBestEffort(runtime.deleteDatabase);
  const cacheCleanupPromise = runBestEffort(async () => {
    const cacheNames = await runtime.listCacheNames();
    const ownedCacheNames = selectPwaOwnedCacheNames(cacheNames);

    await Promise.all(
      ownedCacheNames.map((cacheName) => runBestEffort(() => runtime.deleteCache(cacheName))),
    );
  });

  await Promise.all([unregisterPromise, databaseCleanupPromise, cacheCleanupPromise]);
}

async function runBestEffort(operation: () => Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch {
    // Recovery must keep progressing even when one browser storage subsystem
    // is unavailable. A later visit can retry cleanup while recovery is live.
  }
}
