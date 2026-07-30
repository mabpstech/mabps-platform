#!/usr/bin/env node
/**
 * Snapshot the local SQLite database file for disaster recovery.
 *
 * Usage:
 *   node scripts/backup-sqlite.mjs
 *   DATABASE_URL=./data/mabps.db BACKUP_DIR=./data/backups node scripts/backup-sqlite.mjs
 *
 * For Turso/remote libSQL, use the provider's snapshot/export tooling instead.
 */
import fs from "node:fs";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL || "./data/mabps.db";
const backupDir = process.env.BACKUP_DIR || "./data/backups";

function resolveDbPath(url) {
  if (url.startsWith("file:")) {
    return url.slice("file:".length);
  }
  if (url.startsWith("libsql:") || url.startsWith("http:") || url.startsWith("https:")) {
    console.error(
      "Remote DATABASE_URL detected. Use Turso snapshots / provider backups — this script only copies local SQLite files.",
    );
    process.exit(2);
  }
  return url;
}

const source = path.resolve(resolveDbPath(databaseUrl));
if (!fs.existsSync(source)) {
  console.error(`Database file not found: ${source}`);
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dest = path.join(backupDir, `mabps-${stamp}.db`);

fs.copyFileSync(source, dest);

// Also copy WAL/SHM if present (best-effort consistent local snapshot).
for (const suffix of ["-wal", "-shm"]) {
  const side = `${source}${suffix}`;
  if (fs.existsSync(side)) {
    fs.copyFileSync(side, `${dest}${suffix}`);
  }
}

const stat = fs.statSync(dest);
console.log(`Backup written: ${dest} (${stat.size} bytes)`);
