import { startOfflineShell } from "./offline-shell";
import { clearPostSnapshots, readPostSnapshots } from "./post-snapshot-db.client";

void startOfflineShell({
  document,
  pathname: globalThis.location.pathname,
  snapshotStore: {
    read: readPostSnapshots,
    clear: clearPostSnapshots,
  },
  retry: () => globalThis.location.reload(),
});
