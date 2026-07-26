-- Persist website publish / unpublish history for commercial launch.

CREATE TABLE IF NOT EXISTS "website_publish_event" (
  "id" text not null primary key,
  "siteId" text not null references "website_site" ("id") on delete cascade,
  "action" text not null,
  "status" text not null,
  "versionLabel" text not null,
  "actorUserId" text,
  "actorName" text,
  "note" text,
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "website_publish_event_siteId_idx"
  ON "website_publish_event" ("siteId", "createdAt");
