import { createClient, type Client } from "@libsql/client";
import Database from "libsql";
import { wrapLibsqlDatabase } from "@/lib/db/compat";
import { resolveDatabaseConnection } from "@/lib/db/config";
import { assertDatabaseDriverSupported } from "@/lib/db/driver";
import {
  createReconnectingLibsqlClient,
  createReconnectingSqlite,
} from "@/lib/db/lifecycle";

assertDatabaseDriverSupported();

const connection = resolveDatabaseConnection();

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
  libsqlClient?: Client;
};

/**
 * Open a sync libSQL handle (better-sqlite3-compatible API).
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

function createSqliteHandle(): Database.Database {
  // Local file: long-lived singleton is safe (no Hrana streams).
  if (connection.mode === "local") {
    return openSyncDatabase();
  }

  // Remote Turso: stable facade that reopens when warm serverless reuses an
  // expired Hrana stream ("stream not found"). Better Auth keeps this reference.
  return createReconnectingSqlite(openSyncDatabase);
}

function createLibsqlHandle(): Client {
  const client = createClient(connection.libsqlConfig);
  if (connection.mode === "local") {
    return client;
  }
  return createReconnectingLibsqlClient(client);
}

/**
 * Sync libSQL handle used by repositories and Better Auth.
 * Remote connections recover from expired Hrana streams; do not cache a raw
 * remote Database across idle serverless invocations without this wrapper.
 */
export const sqlite: Database.Database =
  globalForDb.sqlite ?? createSqliteHandle();

/**
 * Official async `@libsql/client` (same URL / AUTH_TOKEN as `sqlite`).
 * Prefer `sqlite` for existing sync repositories; use this for new async paths.
 * Remote clients reconnect once on expired Hrana streams.
 */
export const libsql: Client =
  globalForDb.libsqlClient ?? createLibsqlHandle();

// Dev HMR only: reuse the (already reconnecting) facade. Never cache a raw
// remote connection without recovery — that causes production "stream not found".
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
export { isHranaStreamError } from "@/lib/db/lifecycle";
