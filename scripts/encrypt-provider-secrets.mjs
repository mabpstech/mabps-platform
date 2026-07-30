#!/usr/bin/env node
/**
 * One-shot: encrypt existing plaintext provider secrets at rest.
 *
 * Requires MABPS_SECRETS_KEY. Skips values already prefixed with mabps:v1:.
 * Does not encrypt webhook/path lookup secrets (verifyToken, webhookPathSecret,
 * automation apiKey/webhookSecret) — those must stay equality-queryable.
 *
 * Usage:
 *   MABPS_SECRETS_KEY=... npm run db:encrypt-secrets
 *   MABPS_SECRETS_KEY=... node ./scripts/encrypt-provider-secrets.mjs --dry-run
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./lib/open-db.mjs";
import {
  encryptSecret,
  isEncryptedSecret,
  isSecretsKeyConfigured,
  SECRETS_KEY_ENV,
} from "./lib/secret-crypto.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

if (!isSecretsKeyConfigured()) {
  console.error(
    `Missing ${SECRETS_KEY_ENV}. Generate with: openssl rand -base64 32`,
  );
  process.exit(1);
}

/** @type {{ table: string; column: string; idColumn?: string; where?: string }[]} */
const TARGETS = [
  { table: "ai_provider_credential", column: "apiKey" },
  { table: "chatbot_provider_credential", column: "apiKey" },
  { table: "email_settings", column: "smtpPassword" },
  { table: "email_settings", column: "resendApiKey" },
  { table: "email_settings", column: "sesSecretAccessKey" },
  { table: "email_settings", column: "trackingSecret" },
  { table: "whatsapp_settings", column: "accessToken" },
  { table: "deployment_settings", column: "vercelToken" },
  { table: "deployment_settings", column: "cloudflareApiToken" },
  {
    table: "deployment_env_var",
    column: "value",
    where: `"isSecret" = 1`,
  },
];

function tableExists(db, table) {
  const row = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    )
    .get(table);
  return Boolean(row);
}

const { db, label: databaseLabel } = openDatabase(root);
console.log(
  `${dryRun ? "[dry-run] " : ""}Encrypting provider secrets in ${databaseLabel}`,
);

let scanned = 0;
let encrypted = 0;
let skipped = 0;

for (const target of TARGETS) {
  if (!tableExists(db, target.table)) {
    console.log(`  skip missing table: ${target.table}`);
    continue;
  }

  const where = target.where
    ? `WHERE ${target.where} AND "${target.column}" IS NOT NULL AND TRIM("${target.column}") != ''`
    : `WHERE "${target.column}" IS NOT NULL AND TRIM("${target.column}") != ''`;

  const rows = db
    .prepare(`SELECT "id", "${target.column}" AS value FROM "${target.table}" ${where}`)
    .all();

  for (const row of rows) {
    scanned += 1;
    const value = row.value;
    if (typeof value !== "string" || !value.trim()) {
      skipped += 1;
      continue;
    }
    if (isEncryptedSecret(value)) {
      skipped += 1;
      continue;
    }

    const next = encryptSecret(value);
    if (next === value) {
      skipped += 1;
      continue;
    }

    if (!dryRun) {
      db.prepare(
        `UPDATE "${target.table}" SET "${target.column}" = ? WHERE "id" = ?`,
      ).run(next, row.id);
    }
    encrypted += 1;
    console.log(
      `  ${dryRun ? "would encrypt" : "encrypted"} ${target.table}.${target.column} id=${row.id}`,
    );
  }
}

db.close();
console.log(
  `Done. scanned=${scanned} encrypted=${encrypted} skipped=${skipped}${dryRun ? " (dry-run)" : ""}`,
);
