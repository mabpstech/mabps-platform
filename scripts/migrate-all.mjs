#!/usr/bin/env node
/**
 * Versioned schema migrator for MABPS.
 *
 * 1. Ensures `schema_migrations` tracking table exists.
 * 2. Applies baseline module schemas (idempotent IF NOT EXISTS) as `0001_baseline`
 *    if not yet recorded — safe on existing DBs.
 * 3. Applies pending `migrations/NNNN_*.sql` files in lexical order.
 *
 * Usage: npm run db:migrate:all
 *
 * Auth tables can also be managed by Better Auth (`npm run db:migrate`);
 * baseline includes lib/db/schema.sql so a fresh DB is usable from this runner alone.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./lib/open-db.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "migrations");

/** Ordered baseline modules (feature schemas under lib/<module>/schema.sql). */
const BASELINE_SCHEMAS = [
  ["auth", "lib/db/schema.sql"],
  ["billing", "lib/billing/schema.sql"],
  ["website", "lib/website/schema.sql"],
  ["crm", "lib/crm/schema.sql"],
  ["chatbot", "lib/chatbot/schema.sql"],
  ["automation", "lib/automation/schema.sql"],
  ["knowledge", "lib/knowledge/schema.sql"],
  ["memory", "lib/memory/schema.sql"],
  ["analytics", "lib/analytics/schema.sql"],
  ["ai", "lib/ai/schema.sql"],
  ["whatsapp", "lib/whatsapp/schema.sql"],
  ["email", "lib/email-engine/schema.sql"],
  ["notifications", "lib/notifications/schema.sql"],
  ["deployment", "lib/deployment/schema.sql"],
  ["guardian", "lib/guardian/schema.sql"],
  ["marketplace", "lib/marketplace/schema.sql"],
];

const { db, label: databaseLabel } = openDatabase(root);

db.exec(`
  CREATE TABLE IF NOT EXISTS "schema_migrations" (
    "id" text not null primary key,
    "checksum" text not null,
    "appliedAt" text not null
  );
`);

function checksum(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function isApplied(id) {
  const row = db
    .prepare(`SELECT "id" FROM "schema_migrations" WHERE "id" = ?`)
    .get(id);
  return Boolean(row);
}

function record(id, sum) {
  db.prepare(
    `INSERT INTO "schema_migrations" ("id", "checksum", "appliedAt")
     VALUES (?, ?, ?)`,
  ).run(id, sum, new Date().toISOString());
}

function execSchema(name, sql) {
  try {
    db.exec(sql);
    console.log(`  applied module schema: ${name}`);
  } catch (error) {
    // Auth (and some modules) use CREATE INDEX without IF NOT EXISTS.
    // On an already-bootstrapped DB, tolerate "already exists" and continue.
    const message = error instanceof Error ? error.message : String(error);
    if (/already exists/i.test(message)) {
      console.log(`  reconciled module schema: ${name} (${message})`);
      return;
    }
    throw error;
  }
}

function applyBaseline() {
  const id = "0001_baseline";
  if (isApplied(id)) {
    console.log(`skip ${id} (already applied)`);
    return;
  }

  const parts = [];
  for (const [name, rel] of BASELINE_SCHEMAS) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      throw new Error(`Baseline schema missing: ${rel}`);
    }
    const sql = fs.readFileSync(full, "utf8");
    parts.push(`-- module: ${name}\n${sql}`);
    execSchema(name, sql);
  }

  const sum = checksum(parts.join("\n"));
  record(id, sum);
  console.log(`applied ${id}`);
}

function applySqlMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    console.log("No migrations/ directory; baseline only.");
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => /^\d{4}_.+\.sql$/i.test(name))
    .sort();

  for (const file of files) {
    const id = file.replace(/\.sql$/i, "");
    // Baseline is applied from module schemas, not from a SQL dump.
    if (id === "0001_baseline") {
      console.log(`skip ${file} (handled as module baseline)`);
      continue;
    }
    if (isApplied(id)) {
      console.log(`skip ${id} (already applied)`);
      continue;
    }
    const full = path.join(migrationsDir, file);
    const sql = fs.readFileSync(full, "utf8");
    // Statement-at-a-time so ADD COLUMN is idempotent when baseline schema
    // already includes the same columns (fresh DBs after schema.sql updates).
    const statements = sql
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && !part.split("\n").every((line) => {
        const trimmed = line.trim();
        return trimmed.length === 0 || trimmed.startsWith("--");
      }));
    for (const statement of statements) {
      try {
        db.exec(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          /duplicate column name/i.test(message) ||
          /already exists/i.test(message)
        ) {
          console.log(`  reconciled ${id}: ${message}`);
          continue;
        }
        throw error;
      }
    }
    record(id, checksum(sql));
    console.log(`applied ${id}`);
  }
}

console.log(`Migrating ${databaseLabel}`);
applyBaseline();
applySqlMigrations();

const rows = db
  .prepare(
    `SELECT "id", "appliedAt" FROM "schema_migrations" ORDER BY "id" ASC`,
  )
  .all();
console.log(`Done. ${rows.length} migration(s) recorded:`);
for (const row of rows) {
  console.log(`  - ${row.id} @ ${row.appliedAt}`);
}

db.close();
