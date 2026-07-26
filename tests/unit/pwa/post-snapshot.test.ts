import { describe, expect, it, vi } from "vitest";

import {
  filterValidPostSnapshots,
  PostSnapshotSchema,
  normalizePublicPostSnapshot,
  preparePostSnapshotForStorage,
  selectPostSnapshotIdsToEvict,
  sortPostSnapshotsByMostRecentView,
  type PostSnapshot,
  type PublicPostSnapshotSource,
} from "#app/features/pwa/post-snapshot";
import { capturePublicPostSnapshot } from "#app/features/pwa/post-snapshot-capture";
import {
  PWA_POST_SNAPSHOT_LIMIT,
  PWA_POST_SNAPSHOT_SCHEMA_VERSION,
} from "#app/features/pwa/pwa-config";

const FIRST_VIEW = new Date("2026-07-26T08:00:00.000Z");
const SECOND_VIEW = new Date("2026-07-26T09:00:00.000Z");

function postSource(overrides: Partial<PublicPostSnapshotSource> = {}): PublicPostSnapshotSource {
  return {
    id: "post-1",
    slug: "javna-objava",
    title: "Javna objava",
    body: "<p>Već sanitiziran sadržaj.</p>",
    type: "obavijest",
    publishedAt: new Date("2026-07-20T10:00:00.000Z"),
    updatedAt: "2026-07-21T11:00:00.000Z",
    images: [],
    videos: [],
    ...overrides,
  };
}

function snapshot(
  id: string,
  lastViewedAt: string,
  overrides: Partial<PostSnapshot> = {},
): PostSnapshot {
  return {
    ...normalizePublicPostSnapshot(
      postSource({ id, slug: `objava-${id}` }),
      new Date(lastViewedAt),
    ),
    ...overrides,
  };
}

describe("public post snapshots", () => {
  it("normalizes only the approved public fields", () => {
    const source = {
      ...postSource({
        images: [{ id: "private-image-id", altText: "Slika" }],
        videos: [{ id: "private-video-id", providerId: "youtube-id" }],
      }),
      pinned: true,
      siteUrl: "https://example.test",
      authorId: "private-author-id",
      announcement: "Ne smije biti spremljeno",
    };

    const result = normalizePublicPostSnapshot(source, FIRST_VIEW);

    expect(result).toEqual({
      schemaVersion: PWA_POST_SNAPSHOT_SCHEMA_VERSION,
      id: "post-1",
      slug: "javna-objava",
      title: "Javna objava",
      bodyHtml: "<p>Već sanitiziran sadržaj.</p>",
      type: "obavijest",
      publishedAt: "2026-07-20T10:00:00.000Z",
      updatedAt: "2026-07-21T11:00:00.000Z",
      snapshotRefreshedAt: FIRST_VIEW.toISOString(),
      lastViewedAt: FIRST_VIEW.toISOString(),
      hasImageMedia: true,
      hasVideoMedia: true,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /private-|siteUrl|authorId|announcement|images|videos|pinned/,
    );
  });

  it("rejects malformed, unsupported, and expanded snapshot records", () => {
    const valid = normalizePublicPostSnapshot(postSource(), FIRST_VIEW);

    expect(
      PostSnapshotSchema.safeParse({
        ...valid,
        schemaVersion: PWA_POST_SNAPSHOT_SCHEMA_VERSION + 1,
      }).success,
    ).toBe(false);
    expect(PostSnapshotSchema.safeParse({ ...valid, type: "nepoznato" }).success).toBe(false);
    expect(
      PostSnapshotSchema.safeParse({ ...valid, siteUrl: "https://example.test" }).success,
    ).toBe(false);
  });

  it("keeps valid snapshots when stored records also contain stale or corrupt data", () => {
    const valid = normalizePublicPostSnapshot(postSource(), FIRST_VIEW);

    expect(
      filterValidPostSnapshots([
        { ...valid, schemaVersion: PWA_POST_SNAPSHOT_SCHEMA_VERSION + 1 },
        valid,
        null,
      ]),
    ).toEqual([valid]);
  });

  it("preserves the refresh time when only the view time changes", () => {
    const existing = normalizePublicPostSnapshot(postSource(), FIRST_VIEW);
    const revisited = normalizePublicPostSnapshot(postSource(), SECOND_VIEW);

    expect(preparePostSnapshotForStorage(revisited, existing)).toEqual({
      ...revisited,
      snapshotRefreshedAt: FIRST_VIEW.toISOString(),
      lastViewedAt: SECOND_VIEW.toISOString(),
    });
  });

  it("refreshes stored content when the canonical content changes", () => {
    const existing = normalizePublicPostSnapshot(postSource(), FIRST_VIEW);
    const updated = normalizePublicPostSnapshot(
      postSource({
        title: "Ažurirana javna objava",
        updatedAt: "2026-07-26T08:30:00.000Z",
      }),
      SECOND_VIEW,
    );

    expect(preparePostSnapshotForStorage(updated, existing)).toEqual(updated);
  });

  it("evicts the least recently viewed snapshots above the limit", () => {
    const snapshots = Array.from({ length: PWA_POST_SNAPSHOT_LIMIT + 1 }, (_, index) =>
      snapshot(
        `post-${String(index + 1).padStart(2, "0")}`,
        new Date(FIRST_VIEW.getTime() + index * 1000).toISOString(),
      ),
    );

    expect(selectPostSnapshotIdsToEvict(snapshots)).toEqual(["post-01"]);
  });

  it("uses the post id as a deterministic tie-breaker", () => {
    const viewedAt = FIRST_VIEW.toISOString();

    expect(
      selectPostSnapshotIdsToEvict(
        [snapshot("post-c", viewedAt), snapshot("post-a", viewedAt), snapshot("post-b", viewedAt)],
        2,
      ),
    ).toEqual(["post-a"]);
  });

  it("orders offline lists by most recent view without mutating the records", () => {
    const viewedAt = FIRST_VIEW.toISOString();
    const snapshots = [
      snapshot("post-c", viewedAt),
      snapshot("post-a", viewedAt),
      snapshot("post-new", SECOND_VIEW.toISOString()),
    ];

    expect(sortPostSnapshotsByMostRecentView(snapshots).map(({ id }) => id)).toEqual([
      "post-new",
      "post-a",
      "post-c",
    ]);
    expect(snapshots.map(({ id }) => id)).toEqual(["post-c", "post-a", "post-new"]);
  });

  it("swallows normalization and browser-storage failures", async () => {
    const writeSnapshot = vi
      .fn<PostSnapshotWriter>()
      .mockRejectedValue(new Error("Storage denied"));

    await expect(
      capturePublicPostSnapshot(postSource(), {
        viewedAt: FIRST_VIEW,
        writeSnapshot,
      }),
    ).resolves.toBeUndefined();
    await expect(
      capturePublicPostSnapshot(postSource({ updatedAt: "not-a-date" }), {
        writeSnapshot,
      }),
    ).resolves.toBeUndefined();
    expect(writeSnapshot).toHaveBeenCalledTimes(1);
  });
});

type PostSnapshotWriter = (snapshot: PostSnapshot) => Promise<void>;
