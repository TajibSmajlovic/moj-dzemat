import {
  array,
  boolean,
  enum as enumSchema,
  iso,
  literal,
  maxLength,
  minLength,
  regex,
  strictObject,
  string,
  type infer as Infer,
} from "zod/mini";

import { POST_TYPES, type PostTypeValue } from "#app/features/posts/post-contract";

import { PWA_POST_SNAPSHOT_LIMIT, PWA_POST_SNAPSHOT_SCHEMA_VERSION } from "./pwa-config";

const POST_ID_MAX_LENGTH = 128;
const POST_SLUG_MAX_LENGTH = 80;
const POST_TITLE_MAX_LENGTH = 200;
// Sanitizing a valid 50,000-character post can expand HTML entities, so
// the stored HTML ceiling accounts for the write contract's worst case.
const POST_BODY_HTML_MAX_LENGTH = 300_000;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isoTimestamp = iso.datetime();

export const PostSnapshotSchema = strictObject({
  schemaVersion: literal(PWA_POST_SNAPSHOT_SCHEMA_VERSION),
  id: string().check(minLength(1), maxLength(POST_ID_MAX_LENGTH)),
  slug: string().check(minLength(3), maxLength(POST_SLUG_MAX_LENGTH), regex(SLUG_RE)),
  title: string().check(minLength(3), maxLength(POST_TITLE_MAX_LENGTH)),
  bodyHtml: string().check(minLength(1), maxLength(POST_BODY_HTML_MAX_LENGTH)),
  type: enumSchema(POST_TYPES),
  publishedAt: isoTimestamp,
  updatedAt: isoTimestamp,
  snapshotRefreshedAt: isoTimestamp,
  lastViewedAt: isoTimestamp,
  hasImageMedia: boolean(),
  hasVideoMedia: boolean(),
});

export type PostSnapshot = Infer<typeof PostSnapshotSchema>;
export const PostSnapshotArraySchema = array(PostSnapshotSchema);

export type PublicPostSnapshotSource = {
  id: string;
  slug: string;
  title: string;
  body: string;
  type: PostTypeValue;
  publishedAt: Date | string;
  updatedAt: Date | string;
  images: readonly unknown[];
  videos: readonly unknown[];
};

export function normalizePublicPostSnapshot(
  post: PublicPostSnapshotSource,
  viewedAt = new Date(),
): PostSnapshot {
  const viewedAtIso = toIsoTimestamp(viewedAt);

  return PostSnapshotSchema.parse({
    schemaVersion: PWA_POST_SNAPSHOT_SCHEMA_VERSION,
    id: post.id,
    slug: post.slug,
    title: post.title,
    bodyHtml: post.body,
    type: post.type,
    publishedAt: toIsoTimestamp(post.publishedAt),
    updatedAt: toIsoTimestamp(post.updatedAt),
    snapshotRefreshedAt: viewedAtIso,
    lastViewedAt: viewedAtIso,
    hasImageMedia: post.images.length > 0,
    hasVideoMedia: post.videos.length > 0,
  });
}

export function preparePostSnapshotForStorage(
  incomingSnapshot: PostSnapshot,
  existingRecord: unknown,
): PostSnapshot {
  const incoming = PostSnapshotSchema.parse(incomingSnapshot);
  const existing = PostSnapshotSchema.safeParse(existingRecord);

  if (!existing.success || hasSnapshotContentChanged(existing.data, incoming)) {
    return incoming;
  }

  return {
    ...incoming,
    snapshotRefreshedAt: existing.data.snapshotRefreshedAt,
  };
}

export function filterValidPostSnapshots(records: readonly unknown[]): PostSnapshot[] {
  return records.flatMap((record) => {
    const parsed = PostSnapshotSchema.safeParse(record);

    return parsed.success ? [parsed.data] : [];
  });
}

export function selectPostSnapshotIdsToEvict(
  snapshots: readonly PostSnapshot[],
  limit = PWA_POST_SNAPSHOT_LIMIT,
): string[] {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new RangeError("Snapshot limit must be a non-negative integer.");
  }

  const overflow = snapshots.length - limit;
  if (overflow <= 0) return [];

  const oldestFirst = [...snapshots];
  // Keep ES2022 browser compatibility while sorting only the defensive copy.
  oldestFirst.sort(compareSnapshotsByLastViewed);

  return oldestFirst.slice(0, overflow).map((snapshot) => snapshot.id);
}

export function sortPostSnapshotsByMostRecentView(
  snapshots: readonly PostSnapshot[],
): PostSnapshot[] {
  const mostRecentFirst = [...snapshots];

  mostRecentFirst.sort((left, right) => {
    const timestampOrder = right.lastViewedAt.localeCompare(left.lastViewedAt);

    return timestampOrder === 0 ? left.id.localeCompare(right.id) : timestampOrder;
  });

  return mostRecentFirst;
}

function hasSnapshotContentChanged(existing: PostSnapshot, incoming: PostSnapshot): boolean {
  return (
    existing.schemaVersion !== incoming.schemaVersion ||
    existing.id !== incoming.id ||
    existing.slug !== incoming.slug ||
    existing.title !== incoming.title ||
    existing.bodyHtml !== incoming.bodyHtml ||
    existing.type !== incoming.type ||
    existing.publishedAt !== incoming.publishedAt ||
    existing.updatedAt !== incoming.updatedAt ||
    existing.hasImageMedia !== incoming.hasImageMedia ||
    existing.hasVideoMedia !== incoming.hasVideoMedia
  );
}

function compareSnapshotsByLastViewed(left: PostSnapshot, right: PostSnapshot): number {
  const timestampOrder = left.lastViewedAt.localeCompare(right.lastViewedAt);

  return timestampOrder === 0 ? left.id.localeCompare(right.id) : timestampOrder;
}

function toIsoTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  return date.toISOString();
}
