import { beforeEach, describe, expect, it, vi } from "vitest";

import { startOfflineShell, type OfflineShellSnapshotStore } from "#app/features/pwa/offline-shell";
import { normalizePublicPostSnapshot, type PostSnapshot } from "#app/features/pwa/post-snapshot";

const FIRST_VIEW = new Date("2026-07-26T08:00:00.000Z");
const SECOND_VIEW = new Date("2026-07-26T09:00:00.000Z");

function snapshot(
  id: string,
  slug: string,
  title: string,
  viewedAt: Date,
  overrides: Partial<PostSnapshot> = {},
): PostSnapshot {
  return {
    ...normalizePublicPostSnapshot(
      {
        id,
        slug,
        title,
        body: "<p>Sačuvani <strong>sadržaj</strong>.</p>",
        type: "obavijest",
        publishedAt: new Date("2026-07-20T10:00:00.000Z"),
        updatedAt: new Date("2026-07-21T11:00:00.000Z"),
        images: [],
        videos: [],
      },
      viewedAt,
    ),
    ...overrides,
  };
}

function root(): HTMLElement {
  const element = document.querySelector<HTMLElement>("#offline-app");
  if (!element) throw new Error("Test root is missing.");

  return element;
}

async function renderShell({
  pathname = "/",
  records = [],
  readError,
  clear = vi.fn<() => Promise<void>>().mockResolvedValue(),
}: {
  pathname?: string;
  records?: unknown;
  readError?: Error;
  clear?: OfflineShellSnapshotStore["clear"];
} = {}) {
  const retry = vi.fn();
  const read = readError
    ? vi.fn<() => Promise<unknown>>().mockRejectedValue(readError)
    : vi.fn<() => Promise<unknown>>().mockResolvedValue(records);

  await startOfflineShell({
    document,
    pathname,
    snapshotStore: { read, clear },
    retry,
  });

  return { clear, read, retry };
}

beforeEach(() => {
  document.body.innerHTML = '<main id="offline-app" aria-live="polite" aria-busy="true"></main>';
  document.title = "";
});

describe("offline shell", () => {
  it("shows the empty state and retries the current navigation", async () => {
    const { retry } = await renderShell();
    const retryButton = root().querySelector<HTMLButtonElement>('[data-offline-action="retry"]');

    expect(root().textContent).toContain("Trenutno niste povezani na internet");
    expect(root().textContent).toContain("Još nema sačuvanih objava");
    expect(root().querySelector(".offline-post-link")).toBeNull();
    expect(root().getAttribute("aria-busy")).toBe("false");

    retryButton?.click();
    expect(retry).toHaveBeenCalledOnce();
  });

  it("lists snapshots by most recent view and inserts titles as text", async () => {
    const older = snapshot(
      "post-old",
      "starija-objava",
      '<img src="x" onerror="alert(1)"> Starija',
      FIRST_VIEW,
    );
    const newer = snapshot("post-new", "novija-objava", "Novija objava", SECOND_VIEW);

    await renderShell({ records: [older, newer] });

    const links = [...root().querySelectorAll<HTMLAnchorElement>(".offline-post-link")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/objave/novija-objava",
      "/objave/starija-objava",
    ]);
    expect(links.map((link) => link.querySelector(".offline-post-title")?.textContent)).toEqual([
      "Novija objava",
      '<img src="x" onerror="alert(1)"> Starija',
    ]);
    expect(root().querySelector("img")).toBeNull();
  });

  it("renders a saved post, validated body HTML, and online-only media guidance", async () => {
    const saved = snapshot("post-1", "javna-objava", "Javna objava", FIRST_VIEW, {
      hasImageMedia: true,
      hasVideoMedia: true,
    });

    await renderShell({ pathname: "/objave/javna-objava", records: [saved] });

    expect(root().querySelector("h1")?.textContent).toBe("Javna objava");
    expect(root().querySelector(".offline-prose strong")?.textContent).toBe("sadržaj");
    expect(root().textContent).toContain("Slike i video");
    expect(root().textContent).toContain("Sačuvana verzija");
    expect(root().textContent).toContain("Sačuvano na uređaju 26. jul 2026. u 10:00");
    expect(root().textContent).toContain("Objavljeno 20. jul 2026. u 12:00");
    expect(root().textContent).not.toContain("M07");
    expect(root().querySelector<HTMLAnchorElement>(".offline-back-link")?.pathname).toBe("/");
    expect(document.title).toBe("Javna objava · Bez interneta");
  });

  it("shows the saved list when the requested route is unavailable", async () => {
    const saved = snapshot("post-1", "sacuvana-objava", "Sačuvana objava", FIRST_VIEW);

    await renderShell({ pathname: "/kontakt", records: [saved] });

    expect(root().textContent).toContain(
      "Tražena stranica nije sačuvana za čitanje bez interneta.",
    );
    expect(root().querySelector<HTMLAnchorElement>(".offline-post-link")?.pathname).toBe(
      "/objave/sacuvana-objava",
    );
  });

  it("falls back safely when storage fails or a record has an unsupported shape", async () => {
    await renderShell({ readError: new Error("IndexedDB denied") });

    expect(root().textContent).toContain("Sačuvane objave trenutno nije moguće učitati");
    expect(root().querySelector(".offline-post-list")).toBeNull();

    document.body.innerHTML = '<main id="offline-app" aria-busy="true"></main>';
    await renderShell({
      records: [
        {
          ...snapshot("post-1", "javna-objava", "Javna objava", FIRST_VIEW),
          schemaVersion: 999,
        },
      ],
    });

    expect(root().textContent).toContain("Sačuvane objave trenutno nije moguće učitati");
    expect(root().textContent).not.toContain("Javna objava");
  });

  it("clears only the snapshot store and rerenders the empty state", async () => {
    const clear = vi.fn<() => Promise<void>>().mockResolvedValue();
    const saved = snapshot("post-1", "javna-objava", "Javna objava", FIRST_VIEW);

    await renderShell({ records: [saved], clear });
    root().querySelector<HTMLButtonElement>('[data-offline-action="clear"]')?.click();
    root().querySelector<HTMLButtonElement>('[data-offline-action="clear-confirm"]')?.click();

    await vi.waitFor(() => {
      expect(clear).toHaveBeenCalledOnce();
      expect(root().textContent).toContain("Još nema sačuvanih objava");
    });
  });

  it("keeps saved posts visible when clearing storage fails", async () => {
    const clear = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error("Storage transaction failed"));
    const saved = snapshot("post-1", "javna-objava", "Javna objava", FIRST_VIEW);

    await renderShell({ records: [saved], clear });
    root().querySelector<HTMLButtonElement>('[data-offline-action="clear"]')?.click();
    root().querySelector<HTMLButtonElement>('[data-offline-action="clear-confirm"]')?.click();

    await vi.waitFor(() => {
      expect(root().textContent).toContain("trenutno nije moguće obrisati");
      expect(root().textContent).toContain("Javna objava");
    });
  });

  it("allows cancelling snapshot deletion without touching storage", async () => {
    const clear = vi.fn<() => Promise<void>>().mockResolvedValue();
    const saved = snapshot("post-1", "javna-objava", "Javna objava", FIRST_VIEW);

    await renderShell({ records: [saved], clear });
    root().querySelector<HTMLButtonElement>('[data-offline-action="clear"]')?.click();
    expect(root().textContent).toContain("Obrisati ovu sačuvanu objavu");

    root().querySelector<HTMLButtonElement>('[data-offline-action="clear-cancel"]')?.click();

    expect(clear).not.toHaveBeenCalled();
    expect(root().querySelector('[data-offline-action="clear-confirm"]')).toBeNull();
    expect(root().querySelector('[data-offline-action="clear"]')).not.toBeNull();
  });
});
