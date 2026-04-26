-- Add a publishing state for editorial drafts. Existing rows inherit
-- "published" so current public content remains visible after deploy.
ALTER TABLE "Post" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'published';

CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");
CREATE INDEX "Post_status_type_publishedAt_idx" ON "Post"("status", "type", "publishedAt");
CREATE INDEX "Post_status_featured_publishedAt_idx" ON "Post"("status", "featured", "publishedAt");
