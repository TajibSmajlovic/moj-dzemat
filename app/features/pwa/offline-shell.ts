import { POST_TYPE_LABEL } from "#app/features/posts/post-type";

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
  const container = createElement(document, "div", "offline-stack");
  const backLink = createElement(document, "a", "offline-back-link", "Nazad na sačuvane objave");
  backLink.href = "/";
  const article = createElement(document, "article", "offline-panel offline-article");
  const eyebrow = createElement(document, "p", "offline-eyebrow", "Sačuvana kopija");
  const title = createElement(document, "h1", "offline-title", snapshot.title);
  const metadata = createElement(document, "dl", "offline-metadata");

  metadata.append(
    createMetadataItem(document, "Vrsta", POST_TYPE_LABEL[snapshot.type]),
    createMetadataItem(document, "Objavljeno", formatTimestamp(snapshot.publishedAt)),
    createMetadataItem(
      document,
      "Sačuvano ili obnovljeno",
      formatTimestamp(snapshot.snapshotRefreshedAt),
    ),
  );

  const notice = createElement(
    document,
    "p",
    "offline-notice",
    "Prikazana je kopija sačuvana na ovom uređaju. Sadržaj na mreži je možda u međuvremenu promijenjen.",
  );
  const body = createElement(document, "div", "offline-prose");
  // The public post writer sanitizes body HTML before persistence, and the
  // complete strict snapshot schema is validated immediately before rendering.
  body.innerHTML = snapshot.bodyHtml;

  article.append(eyebrow, title, metadata, notice);

  const mediaNotice = getMediaNotice(snapshot);
  if (mediaNotice) {
    article.append(createElement(document, "p", "offline-media-notice", mediaNotice));
  }

  article.append(body, createRetryButton(document, retry));
  container.append(backLink, article);

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
    container.append(
      createElement(
        document,
        "p",
        "offline-route-notice",
        "Tražena stranica nije sačuvana za čitanje bez interneta.",
      ),
    );
  }

  const introduction = createElement(document, "section", "offline-panel");
  introduction.append(
    createElement(document, "p", "offline-eyebrow", "Način rada bez interneta"),
    createElement(document, "h1", "offline-title", "Trenutno niste povezani na internet"),
    createElement(
      document,
      "p",
      "offline-description",
      "Možete čitati objave koje ste ranije otvorili na ovom uređaju ili pokušati ponovo uspostaviti vezu.",
    ),
    createRetryButton(document, retry),
  );
  container.append(introduction);

  const savedSection = createElement(document, "section", "offline-panel");
  savedSection.append(createElement(document, "h2", "offline-section-title", "Sačuvane objave"));

  if (snapshots.length === 0) {
    savedSection.append(
      createElement(
        document,
        "p",
        "offline-empty",
        "Još nema sačuvanih objava. Otvorite objavu dok ste povezani kako biste je kasnije mogli čitati bez interneta.",
      ),
    );
  } else {
    const list = createElement(document, "ul", "offline-post-list");

    for (const snapshot of snapshots) {
      list.append(renderSavedPostListItem(document, snapshot));
    }

    const actionStatus = createElement(document, "p", "offline-action-status");
    actionStatus.setAttribute("role", "status");
    const clearButton = createElement(
      document,
      "button",
      "offline-button offline-button-secondary",
      "Obriši sačuvane objave",
    );
    clearButton.type = "button";
    clearButton.dataset.offlineAction = "clear";
    clearButton.addEventListener("click", () => {
      clearButton.disabled = true;
      actionStatus.textContent = "Brisanje sačuvanih objava…";

      void clearSnapshots()
        .then(() => rerender([]))
        .catch(() => {
          clearButton.disabled = false;
          actionStatus.textContent =
            "Sačuvane objave trenutno nije moguće obrisati. Pokušajte ponovo.";
        });
    });

    savedSection.append(list, clearButton, actionStatus);
  }

  container.append(savedSection);

  return container;
}

function renderSavedPostListItem(document: Document, snapshot: PostSnapshot): HTMLLIElement {
  const item = createElement(document, "li", "offline-post-item");
  const link = createElement(document, "a", "offline-post-link");
  link.href = `/objave/${snapshot.slug}`;
  link.append(
    createElement(document, "span", "offline-post-title", snapshot.title),
    createElement(
      document,
      "span",
      "offline-post-meta",
      `${POST_TYPE_LABEL[snapshot.type]} · Sačuvano ${formatTimestamp(snapshot.snapshotRefreshedAt)}`,
    ),
  );
  item.append(link);

  return item;
}

function renderStorageFallback(root: HTMLElement, document: Document, retry: () => void): void {
  document.title = "Bez interneta · Moj džemat";
  const panel = createElement(document, "section", "offline-panel");
  panel.append(
    createElement(document, "p", "offline-eyebrow", "Način rada bez interneta"),
    createElement(document, "h1", "offline-title", "Trenutno niste povezani na internet"),
    createElement(
      document,
      "p",
      "offline-description",
      "Sačuvane objave trenutno nije moguće učitati na ovom uređaju. Pokušajte ponovo kada provjerite vezu.",
    ),
    createRetryButton(document, retry),
  );
  root.replaceChildren(panel);
}

function createRetryButton(document: Document, retry: () => void): HTMLButtonElement {
  const button = createElement(
    document,
    "button",
    "offline-button offline-button-primary",
    "Pokušaj ponovo",
  );
  button.type = "button";
  button.dataset.offlineAction = "retry";
  button.addEventListener("click", retry);

  return button;
}

function createMetadataItem(document: Document, label: string, value: string): HTMLDivElement {
  const item = createElement(document, "div", "offline-metadata-item");
  item.append(
    createElement(document, "dt", "offline-metadata-label", label),
    createElement(document, "dd", "offline-metadata-value", value),
  );

  return item;
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

function getMediaNotice(snapshot: PostSnapshot): string | undefined {
  if (snapshot.hasImageMedia && snapshot.hasVideoMedia) {
    return "Slike i video iz ove objave dostupni su samo kada ste povezani na internet.";
  }
  if (snapshot.hasImageMedia) {
    return "Slike iz ove objave dostupne su samo kada ste povezani na internet.";
  }
  if (snapshot.hasVideoMedia) {
    return "Video iz ove objave dostupan je samo kada ste povezani na internet.";
  }

  return undefined;
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("bs-BA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}
