-- Website Media Library DAM columns + folder support.
--
-- Baseline used CREATE TABLE IF NOT EXISTS, so databases created before the
-- DAM upgrade kept the old website_media shape. schema.sql indexes on
-- "folderId" / "favorited" then fail with: no such column: "folderId".
--
-- Forward-only ALTERs preserve existing media rows.

CREATE TABLE IF NOT EXISTS "website_media_folder" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "siteId" text not null references "website_site" ("id") on delete cascade,
  "name" text not null,
  "parentId" text,
  "sortOrder" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);

ALTER TABLE "website_media" ADD COLUMN "folderId" text;
ALTER TABLE "website_media" ADD COLUMN "favorited" integer not null default 0;
ALTER TABLE "website_media" ADD COLUMN "lastUsedAt" text;
ALTER TABLE "website_media" ADD COLUMN "uploadedByUserId" text;
ALTER TABLE "website_media" ADD COLUMN "uploadedByName" text;
ALTER TABLE "website_media" ADD COLUMN "variants" text not null default '{}';

CREATE INDEX IF NOT EXISTS "website_media_folderId_idx" on "website_media" ("folderId");
CREATE INDEX IF NOT EXISTS "website_media_favorited_idx" on "website_media" ("siteId", "favorited");
CREATE INDEX IF NOT EXISTS "website_media_folder_siteId_idx" on "website_media_folder" ("siteId");
