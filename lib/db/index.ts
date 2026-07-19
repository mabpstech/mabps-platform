import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { assertDatabaseDriverSupported } from "@/lib/db/driver";

assertDatabaseDriverSupported();

const dataDir = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
const databaseFile = process.env.DATABASE_URL
  ? path.isAbsolute(process.env.DATABASE_URL)
    ? process.env.DATABASE_URL
    : path.join(/* turbopackIgnore: true */ process.cwd(), process.env.DATABASE_URL)
  : path.join(dataDir, "mabps.db");

fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
};

export const sqlite =
  globalForDb.sqlite ??
  new Database(databaseFile, {
    fileMustExist: false,
  });

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
}

export { resolveDatabaseDriver, assertDatabaseDriverSupported } from "@/lib/db/driver";
export type { DatabaseDriver } from "@/lib/db/driver";
