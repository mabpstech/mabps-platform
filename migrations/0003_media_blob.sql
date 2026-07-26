-- Database-backed media blob storage for serverless (Vercel / Turso).
-- Website media bytes live in media_blob. website_media.storagePath is the key.

CREATE TABLE IF NOT EXISTS "media_blob" (
  "key" text not null primary key,
  "contentType" text not null default 'application/octet-stream',
  "bytes" blob not null,
  "sizeBytes" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);
