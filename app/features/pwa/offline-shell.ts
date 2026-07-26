import { POST_TYPE_LABEL } from "#app/features/posts/post-type";
import { formatDateTimeLong } from "#app/lib/date";

import {
  PostSnapshotArraySchema,
  sortPostSnapshotsByMostRecentView,
  type PostSnapshot,
} from "./post-snapshot";

export type OfflineShellSnapshotStore = {
  read: () => Promise<unknown>;
  clear: () => Promise<void>;
};

type StartOfflineShellOptions = {
  document: Document;
  pathname: string;
  snapshotStore: OfflineShellSnapshotStore;
  retry: () => void;
};

type RenderOptions = Omit<StartOfflineShellOptions, "snapshotStore"> & {
  snapshots: PostSnapshot[];
  clearSnapshots: () => Promise<void>;
};

export async function startOfflineShell({
  document,
  pathname,
  snapshotStore,
  retry,
}: StartOfflineShellOptions): Promise<void> {
  const root = document.querySelector<HTMLElement>("#offline-app");
  if (!root) throw new Error("The offline shell root is missing.");

  try {
    const records = await snapshotStore.read();
    const snapshots = PostSnapshotArraySchema.parse(records);

    renderOfflineContent(root, {
      document,
      pathname,
      snapshots: sortPostSnapshotsByMostRecentView(snapshots),
      clearSnapshots: snapshotStore.clear,
      retry,
    });
  } catch {
    renderStorageFallback(root, document, retry);
  } finally {
    root.setAttribute("aria-busy", "false");
  }
}

function renderOfflineContent(
  root: HTMLElement,
  { document, pathname, snapshots, clearSnapshots, retry }: RenderOptions,
): void {
  const requestedSlug = getRequestedPostSlug(pathname);
  const requestedSnapshot = requestedSlug
    ? snapshots.find((snapshot) => snapshot.slug === requestedSlug)
    : undefined;

  if (requestedSnapshot) {
    document.title = `${requestedSnapshot.title} · Bez interneta`;
    root.replaceChildren(renderSavedPost(document, requestedSnapshot, retry));
    return;
  }

  document.title = "Bez interneta · Moj džemat";
  root.replaceChildren(
    renderSavedPostList(document, {
      snapshots,
      requestedRouteUnavailable: pathname !== "/",
      clearSnapshots,
      retry,
      rerender: (nextSnapshots) => {
        renderOfflineContent(root, {
          document,
          pathname,
          snapshots: nextSnapshots,
          clearSnapshots,
          retry,
        });
      },
    }),
  );
}

function renderSavedPost(
  document: Document,
  snapshot: PostSnapshot,
  retry: () => void,
): HTMLElement {
  const container = createElement(document, "div", "offline-article-shell");
  const backLink = createElement(document, "a", "offline-back-link", "Sačuvane objave");
  backLink.href = "/";

  const copyStatus = createElement(document, "section", "offline-copy-status");
  copyStatus.setAttribute("aria-label", "Status sačuvane objave");
  const copyDetails = createElement(document, "div", "offline-copy-details");
  copyDetails.append(
    createElement(document, "strong", "offline-copy-label", "Sačuvana verzija"),
    createElement(
      document,
      "span",
      "offline-copy-date",
      `Sačuvano na uređaju ${formatTimestamp(snapshot.snapshotRefreshedAt)}`,
    ),
  );
  copyStatus.append(copyDetails, createRetryButton(document, retry, "outline"));

  const article = createElement(document, "article", "offline-article");
  const title = createElement(document, "h1", "offline-article-title", snapshot.title);
  const metadata = createElement(document, "div", "offline-article-meta");
  const typeBadge = createPostTypeBadge(document, snapshot);
  const publishedDate = createElement(
    document,
    "time",
    "offline-published-date",
    `Objavljeno ${formatTimestamp(snapshot.publishedAt)}`,
  );
  publishedDate.dateTime = snapshot.publishedAt;
  metadata.append(typeBadge, publishedDate);
  article.append(title, metadata);

  const mediaGuidance = getMediaGuidance(snapshot);
  if (mediaGuidance) {
    const mediaPlaceholder = createElement(document, "section", "offline-media-placeholder");
    mediaPlaceholder.setAttribute("aria-label", "Medijski sadržaj nije dostupan");
    mediaPlaceholder.append(
      createElement(document, "p", "offline-media-title", mediaGuidance.title),
      createElement(document, "p", "offline-media-description", mediaGuidance.description),
    );
    article.append(mediaPlaceholder);
  }

  const body = createElement(document, "div", "offline-prose");
  // The public post writer sanitizes body HTML before persistence, and the
  // complete strict snapshot schema is validated immediately before rendering.
  body.innerHTML = snapshot.bodyHtml;
  article.append(body);
  container.append(backLink, copyStatus, article);

  return container;
}

type SavedPostListOptions = {
  snapshots: PostSnapshot[];
  requestedRouteUnavailable: boolean;
  clearSnapshots: () => Promise<void>;
  retry: () => void;
  rerender: (snapshots: PostSnapshot[]) => void;
};

function renderSavedPostList(
  document: Document,
  { snapshots, requestedRouteUnavailable, clearSnapshots, retry, rerender }: SavedPostListOptions,
): HTMLElement {
  const container = createElement(document, "div", "offline-stack");

  if (requestedRouteUnavailable) {
    const routeNotice = createElement(
      document,
      "p",
      "offline-route-notice",
      "Tražena stranica nije sačuvana za čitanje bez interneta. Prikazujemo objave dostupne na ovom uređaju.",
    );
    routeNotice.setAttribute("role", "status");
    container.append(routeNotice);
  }

  container.append(renderConnectionStatus(document, retry));

  const savedSection = createElement(document, "section", "offline-saved-section");
  const heading = createElement(document, "div", "offline-section-heading");
  heading.append(createElement(document, "h1", "offline-section-title", "Sačuvane objave"));
  if (snapshots.length > 0) {
    heading.append(
      createElement(
        document,
        "p",
        "offline-section-count",
        `Sačuvano na ovom uređaju: ${String(snapshots.length)}`,
      ),
    );
  }
  savedSection.append(heading);

  if (snapshots.length === 0) {
    const emptyState = createElement(document, "div", "offline-empty-state");
    emptyState.append(
      createElement(
        document,
        "p",
        "offline-empty",
        "Još nema sačuvanih objava. Otvorite objavu dok ste povezani kako biste je kasnije mogli čitati bez interneta.",
      ),
    );
    savedSection.append(emptyState);
  } else {
    const list = createElement(document, "ul", "offline-post-list");

    for (const snapshot of snapshots) {
      list.append(renderSavedPostListItem(document, snapshot));
    }

    savedSection.append(
      list,
      renderClearActions(document, {
        clearSnapshots,
        rerender,
        snapshots,
      }),
    );
  }

  container.append(savedSection);

  return container;
}

function renderConnectionStatus(document: Document, retry: () => void): HTMLElement {
  const connection = createElement(document, "section", "offline-connection");
  connection.setAttribute("aria-label", "Status veze");
  const copy = createElement(document, "div", "offline-connection-copy");
  copy.append(
    createElement(document, "p", "offline-connection-title", "Trenutno niste povezani na internet"),
    createElement(
      document,
      "p",
      "offline-connection-description",
      "Prikazujemo sadržaj koji je ranije sačuvan na ovom uređaju.",
    ),
  );
  connection.append(copy, createRetryButton(document, retry, "primary"));

  return connection;
}

function renderSavedPostListItem(document: Document, snapshot: PostSnapshot): HTMLLIElement {
  const item = createElement(document, "li", "offline-post-item");
  const link = createElement(document, "a", "offline-post-link");
  link.href = `/objave/${snapshot.slug}`;

  const title = createElement(document, "h2", "offline-post-title", snapshot.title);
  const footer = createElement(document, "div", "offline-post-footer");
  const savedDate = createElement(
    document,
    "time",
    "offline-post-meta",
    `Sačuvano ${formatTimestamp(snapshot.snapshotRefreshedAt)}`,
  );
  savedDate.dateTime = snapshot.snapshotRefreshedAt;
  footer.append(savedDate, createElement(document, "span", "offline-post-cta", "Pročitaj →"));
  link.append(createPostTypeBadge(document, snapshot, "offline-post-badge"), title, footer);
  item.append(link);

  return item;
}

function renderClearActions(
  document: Document,
  {
    clearSnapshots,
    rerender,
    snapshots,
  }: {
    clearSnapshots: () => Promise<void>;
    rerender: (snapshots: PostSnapshot[]) => void;
    snapshots: PostSnapshot[];
  },
): HTMLElement {
  const area = createElement(document, "div", "offline-clear-area");
  const status = createElement(document, "p", "offline-action-status");
  status.setAttribute("role", "status");

  const showDefaultAction = () => {
    const clearButton = createElement(
      document,
      "button",
      "offline-button offline-button-ghost-danger",
      "Obriši sve",
    );
    clearButton.type = "button";
    clearButton.dataset.offlineAction = "clear";
    clearButton.addEventListener("click", showConfirmation);
    area.replaceChildren(clearButton, status);
  };

  const showConfirmation = () => {
    const confirmation = createElement(document, "div", "offline-clear-confirmation");
    const prompt = createElement(
      document,
      "p",
      "offline-clear-prompt",
      `Obrisati ${formatSnapshotDeletionCount(snapshots.length)} sa ovog uređaja?`,
    );
    const cancelButton = createElement(
      document,
      "button",
      "offline-button offline-button-outline",
      "Odustani",
    );
    cancelButton.type = "button";
    cancelButton.dataset.offlineAction = "clear-cancel";
    cancelButton.addEventListener("click", showDefaultAction);

    const confirmButton = createElement(
      document,
      "button",
      "offline-button offline-button-danger",
      "Potvrdi brisanje",
    );
    confirmButton.type = "button";
    confirmButton.dataset.offlineAction = "clear-confirm";
    confirmButton.addEventListener("click", () => {
      confirmButton.disabled = true;
      cancelButton.disabled = true;
      status.textContent = "Brisanje sačuvanih objava…";
      confirmation.append(status);

      void clearSnapshots()
        .then(() => rerender([]))
        .catch(() => {
          status.textContent = "Sačuvane objave trenutno nije moguće obrisati. Pokušajte ponovo.";
          showDefaultAction();
        });
    });

    confirmation.append(prompt, cancelButton, confirmButton);
    area.replaceChildren(confirmation);
  };

  showDefaultAction();

  return area;
}

function renderStorageFallback(root: HTMLElement, document: Document, retry: () => void): void {
  document.title = "Bez interneta · Moj džemat";
  const container = createElement(document, "div", "offline-stack");
  container.append(renderConnectionStatus(document, retry));

  const savedSection = createElement(document, "section", "offline-saved-section");
  const heading = createElement(document, "div", "offline-section-heading");
  heading.append(createElement(document, "h1", "offline-section-title", "Sačuvane objave"));
  const emptyState = createElement(document, "div", "offline-empty-state");
  emptyState.append(
    createElement(
      document,
      "p",
      "offline-empty",
      "Sačuvane objave trenutno nije moguće učitati na ovom uređaju. Pokušajte ponovo kada provjerite vezu.",
    ),
  );
  savedSection.append(heading, emptyState);
  container.append(savedSection);
  root.replaceChildren(container);
}

function createRetryButton(
  document: Document,
  retry: () => void,
  variant: "primary" | "outline",
): HTMLButtonElement {
  const button = createElement(
    document,
    "button",
    `offline-button offline-button-${variant}`,
    variant === "outline" ? "Provjeri vezu" : "Pokušaj ponovo",
  );
  button.type = "button";
  button.dataset.offlineAction = "retry";
  button.addEventListener("click", retry);

  return button;
}

function createPostTypeBadge(
  document: Document,
  snapshot: PostSnapshot,
  className = "offline-article-badge",
): HTMLSpanElement {
  const badge = createElement(document, "span", className, POST_TYPE_LABEL[snapshot.type]);
  badge.dataset.postType = snapshot.type;

  return badge;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tagName: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function getRequestedPostSlug(pathname: string): string | undefined {
  const match = /^\/objave\/([^/]+)\/?$/.exec(pathname);
  if (!match?.[1]) return undefined;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}

function getMediaGuidance(
  snapshot: PostSnapshot,
): { title: string; description: string } | undefined {
  if (snapshot.hasImageMedia && snapshot.hasVideoMedia) {
    return {
      title: "Slike i video nisu dostupni bez interneta",
      description: "Medijski sadržaj ove objave možete pogledati kada ponovo uspostavite vezu.",
    };
  }
  if (snapshot.hasImageMedia) {
    return {
      title: "Slike nisu dostupne bez interneta",
      description: "Slike iz ove objave možete pogledati kada ponovo uspostavite vezu.",
    };
  }
  if (snapshot.hasVideoMedia) {
    return {
      title: "Video nije dostupan bez interneta",
      description: "Video iz ove objave možete pogledati kada ponovo uspostavite vezu.",
    };
  }

  return undefined;
}

function formatTimestamp(timestamp: string): string {
  return formatDateTimeLong(timestamp);
}

function formatSnapshotDeletionCount(count: number): string {
  if (count === 1) return "ovu sačuvanu objavu";

  const finalTwoDigits = count % 100;
  const finalDigit = count % 10;
  const noun =
    finalDigit >= 2 && finalDigit <= 4 && (finalTwoDigits < 12 || finalTwoDigits > 14)
      ? "sačuvane objave"
      : "sačuvanih objava";

  return `${String(count)} ${noun}`;
}
