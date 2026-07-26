-- Nested website navigation (one-level dropdowns).
--
-- Fresh databases already get parentId from lib/website/schema.sql.
-- This ALTER upgrades existing installs created before nested nav.

ALTER TABLE "website_nav_item" ADD COLUMN "parentId" text;

CREATE INDEX IF NOT EXISTS "website_nav_item_parentId_idx"
  ON "website_nav_item" ("parentId");
