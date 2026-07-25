/**
 * Shared DB opener for migration / ops scripts.
 * Mirrors lib/db connection rules: local file (dev) or Turso via DATABASE_URL + AUTH_TOKEN.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Database from "libsql";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(projectRoot, ".env") });

function isRemoteLibsqlUrl(url) {
  return /^(libsql:|https?:\/\/|wss?:\/\/)/i.test(String(url || "").trim());
}

function resolveAuthToken() {
  return (
    process.env.AUTH_TOKEN?.trim() ||
    process.env.TURSO_AUTH_TOKEN?.trim() ||
    undefined
  );
}

/**
 * @param {string} root Absolute project root
 * @returns {{ db: import("libsql"), label: string }}
 */
export function openDatabase(root) {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const authToken = resolveAuthToken();

  if (databaseUrl && isRemoteLibsqlUrl(databaseUrl)) {
    if (!authToken) {
      throw new Error(
        "AUTH_TOKEN is required when DATABASE_URL points at a remote Turso/libSQL database.",
      );
    }
    const db = new Database(databaseUrl, { authToken });
    db.pragma("foreign_keys = ON");
    return { db, label: databaseUrl };
  }

  const stripped = databaseUrl ? databaseUrl.replace(/^file:/i, "") : undefined;
  const databaseFile = stripped
    ? path.isAbsolute(stripped)
      ? stripped
      : path.join(root, stripped)
    : path.join(root, "data", "mabps.db");

  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
  const db = new Database(databaseFile);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return { db, label: databaseFile };
}
