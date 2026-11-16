import { startOfflineShell } from "./offline-shell";
import { clearPostSnapshots, readPostSnapshots } from "./post-snapshot-db.client";

void startOfflineShell({
  document,
  pathname: location.pathname,
  snapshotStore: {
    read: readPostSnapshots,
    clear: clearPostSnapshots,
  },
  retry: () => location.reload(),
});
