import { useEffect } from "react";

import {
  normalizePublicPostSnapshot,
  type PostSnapshot,
  type PublicPostSnapshotSource,
} from "./post-snapshot";

type PostSnapshotWriter = (snapshot: PostSnapshot) => Promise<void>;

type CaptureOptions = {
  viewedAt?: Date;
  writeSnapshot?: PostSnapshotWriter;
};

export async function capturePublicPostSnapshot(
  post: PublicPostSnapshotSource,
  options: CaptureOptions = {},
): Promise<void> {
  try {
    const snapshot = normalizePublicPostSnapshot(post, options.viewedAt);
    let writeSnapshot = options.writeSnapshot;

    if (!writeSnapshot) {
      const databaseModule = await import("./post-snapshot-db.client");
      writeSnapshot = databaseModule.writePostSnapshot;
    }

    await writeSnapshot(snapshot);
  } catch {
    // Offline snapshots are best-effort browser storage. They must never
    // interrupt or report an error on the successfully rendered online page.
  }
}

export function PostSnapshotCapture({ post }: { post: PublicPostSnapshotSource }) {
  useEffect(() => {
    void capturePublicPostSnapshot(post);
  }, [post]);

  return null;
}
