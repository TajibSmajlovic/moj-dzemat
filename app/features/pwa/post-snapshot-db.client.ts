import {
  filterValidPostSnapshots,
  PostSnapshotSchema,
  preparePostSnapshotForStorage,
  selectPostSnapshotIdsToEvict,
  type PostSnapshot,
} from "./post-snapshot";
import {
  PWA_DATABASE_NAME,
  PWA_DATABASE_VERSION,
  PWA_POST_SNAPSHOT_LAST_VIEWED_INDEX,
  PWA_POST_SNAPSHOT_STORE,
} from "./pwa-config";

export async function writePostSnapshot(snapshot: PostSnapshot): Promise<void> {
  const validatedSnapshot = PostSnapshotSchema.parse(snapshot);
  const database = await openPostSnapshotDatabase();

  try {
    await writeAndEvict(database, validatedSnapshot);
  } finally {
    database.close();
  }
}

export async function readPostSnapshots(): Promise<PostSnapshot[]> {
  const database = await openPostSnapshotDatabase();

  try {
    const transaction = database.transaction(PWA_POST_SNAPSHOT_STORE, "readonly");
    const request = transaction.objectStore(PWA_POST_SNAPSHOT_STORE).getAll();
    const records = await readRequest(request, "Could not read the saved PWA post snapshots.");

    return filterValidPostSnapshots(records);
  } finally {
    database.close();
  }
}

export async function clearPostSnapshots(): Promise<void> {
  const database = await openPostSnapshotDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(PWA_POST_SNAPSHOT_STORE, "readwrite");

      transaction.addEventListener("complete", () => resolve());
      transaction.addEventListener("abort", () => {
        reject(transaction.error ?? new Error("Could not clear the saved PWA post snapshots."));
      });
      transaction.objectStore(PWA_POST_SNAPSHOT_STORE).clear();
    });
  } finally {
    database.close();
  }
}

function openPostSnapshotDatabase(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error("IndexedDB is not available."));
  }

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(PWA_DATABASE_NAME, PWA_DATABASE_VERSION);
    let settled = false;

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      const transaction = request.transaction;
      let store: IDBObjectStore;

      if (database.objectStoreNames.contains(PWA_POST_SNAPSHOT_STORE)) {
        if (!transaction) {
          throw new Error("IndexedDB upgrade transaction is unavailable.");
        }
        store = transaction.objectStore(PWA_POST_SNAPSHOT_STORE);
      } else {
        store = database.createObjectStore(PWA_POST_SNAPSHOT_STORE, { keyPath: "id" });
      }

      if (!store.indexNames.contains(PWA_POST_SNAPSHOT_LAST_VIEWED_INDEX)) {
        store.createIndex(PWA_POST_SNAPSHOT_LAST_VIEWED_INDEX, ["lastViewedAt", "id"], {
          unique: false,
        });
      }
    });

    request.addEventListener("error", () => {
      settled = true;
      reject(request.error ?? new Error("Could not open the PWA snapshot database."));
    });

    request.addEventListener("blocked", () => {
      settled = true;
      reject(new Error("The PWA snapshot database upgrade is blocked."));
    });

    request.addEventListener("success", () => {
      if (settled) {
        request.result.close();
        return;
      }

      settled = true;
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    });
  });
}

function readRequest<T>(request: IDBRequest<T>, fallbackMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => {
      reject(request.error ?? new Error(fallbackMessage));
    });
  });
}

function writeAndEvict(database: IDBDatabase, snapshot: PostSnapshot): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PWA_POST_SNAPSHOT_STORE, "readwrite");
    const store = transaction.objectStore(PWA_POST_SNAPSHOT_STORE);
    let operationError: unknown;

    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("abort", () => {
      const error = operationError ?? transaction.error;

      reject(
        error instanceof Error ? error : new Error("Could not update the PWA snapshot database."),
      );
    });

    const existingRequest = store.get(snapshot.id);

    existingRequest.addEventListener("success", () => {
      let preparedSnapshot: PostSnapshot;

      try {
        preparedSnapshot = preparePostSnapshotForStorage(snapshot, existingRequest.result);
      } catch (error: unknown) {
        operationError = error;
        transaction.abort();
        return;
      }

      store.put(preparedSnapshot);
      const allSnapshotsRequest = store.getAll();

      allSnapshotsRequest.addEventListener("success", () => {
        try {
          const validSnapshots: PostSnapshot[] = [];

          for (const record of allSnapshotsRequest.result) {
            const parsed = PostSnapshotSchema.safeParse(record);

            if (parsed.success) {
              validSnapshots.push(parsed.data);
            } else {
              const invalidId = getInvalidRecordId(record);
              if (invalidId) store.delete(invalidId);
            }
          }

          for (const id of selectPostSnapshotIdsToEvict(validSnapshots)) {
            store.delete(id);
          }
        } catch (error: unknown) {
          operationError = error;
          transaction.abort();
        }
      });
    });
  });
}

function getInvalidRecordId(record: unknown): string | undefined {
  if (!record || typeof record !== "object" || !("id" in record)) return undefined;

  const { id } = record;

  return typeof id === "string" && id ? id : undefined;
}
