#!/usr/bin/env node
/**
 * One-shot: upload local website media files to S3/R2 using website_media.storagePath.
 *
 * Requires MEDIA_STORAGE_DRIVER=s3 (or s3 env vars) and a local data/uploads tree.
 * Does not delete local files.
 *
 * Usage:
 *   S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
 *   S3_ENDPOINT=... node ./scripts/migrate-media-to-s3.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { openDatabase } from "./lib/open-db.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return value;
}

function toObjectKey(storagePath) {
  const normalized = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const prefix = "data/uploads/";
  if (normalized.startsWith(prefix)) return normalized.slice(prefix.length);
  return normalized;
}

const bucket = requireEnv("S3_BUCKET");
const client = new S3Client({
  region: process.env.S3_REGION?.trim() || "auto",
  endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
  forcePathStyle:
    (process.env.S3_FORCE_PATH_STYLE || "true").toLowerCase() !== "false",
  credentials: {
    accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
  },
});

const { db } = openDatabase(root);
const rows = db
  .prepare(
    `SELECT "id", "storagePath", "mimeType" FROM "website_media" ORDER BY "createdAt" ASC`,
  )
  .all();
db.close();

async function main() {
  let uploaded = 0;
  let missing = 0;

  for (const row of rows) {
    const absolute = path.isAbsolute(row.storagePath)
      ? row.storagePath
      : path.join(root, row.storagePath);
    if (!fs.existsSync(absolute)) {
      console.warn(`[skip missing] ${row.id} ${row.storagePath}`);
      missing += 1;
      continue;
    }
    const body = fs.readFileSync(absolute);
    const key = toObjectKey(row.storagePath);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: row.mimeType || "application/octet-stream",
      }),
    );
    uploaded += 1;
    console.log(`[ok] ${row.id} -> s3://${bucket}/${key}`);
  }

  console.log(
    `Done. uploaded=${uploaded} missing=${missing} total=${rows.length}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
