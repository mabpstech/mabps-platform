import { createClient, type Client } from "@libsql/client";
import Database from "libsql";
import { wrapLibsqlDatabase } from "@/lib/db/compat";
import { resolveDatabaseConnection } from "@/lib/db/config";
import { assertDatabaseDriverSupported } from "@/lib/db/driver";

assertDatabaseDriverSupported();

const connection = resolveDatabaseConnection();

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
  libsqlClient?: Client;
};

/**
 * Sync libSQL handle with a better-sqlite3-compatible API.
 * Local file in development; remote Turso when DATABASE_URL is libsql/https + AUTH_TOKEN.
 */
function openSyncDatabase(): Database.Database {
  const raw =
    connection.mode === "remote"
      ? new Database(connection.url, {
          authToken: connection.authToken,
        } as ConstructorParameters<typeof Database>[1])
      : new Database(connection.path);

  if (connection.mode === "local") {
    raw.pragma("journal_mode = WAL");
  }
  raw.pragma("foreign_keys = ON");

  return wrapLibsqlDatabase(raw);
}

export const sqlite =
  globalForDb.sqlite ?? openSyncDatabase();

/**
 * Official async `@libsql/client` (same URL / AUTH_TOKEN as `sqlite`).
 * Prefer `sqlite` for existing sync repositories; use this for new async paths.
 */
export const libsql: Client =
  globalForDb.libsqlClient ?? createClient(connection.libsqlConfig);

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
  globalForDb.libsqlClient = libsql;
}

export { resolveDatabaseDriver, assertDatabaseDriverSupported } from "@/lib/db/driver";
export type { DatabaseDriver } from "@/lib/db/driver";
export {
  resolveDatabaseConnection,
  resolveAuthToken,
  isRemoteLibsqlUrl,
} from "@/lib/db/config";
export { createLibsqlTransaction, stripRowMetadata } from "@/lib/db/compat";
