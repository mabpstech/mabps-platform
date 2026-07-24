export type DatabaseDriver = "sqlite" | "libsql" | "postgres";

function isRemoteLibsqlUrl(url: string): boolean {
  return /^(libsql:|https?:\/\/|wss?:\/\/)/i.test(url.trim());
}

export function resolveDatabaseDriver(): DatabaseDriver {
  const raw = (process.env.DATABASE_DRIVER || "").trim().toLowerCase();
  if (raw === "libsql" || raw === "turso") return "libsql";
  if (raw === "postgres" || raw === "postgresql" || raw === "pg") {
    return "postgres";
  }
  if (raw === "sqlite") return "sqlite";

  // Auto-detect Turso / remote libSQL from DATABASE_URL when driver is unset.
  const url = process.env.DATABASE_URL?.trim() || "";
  if (url && isRemoteLibsqlUrl(url)) return "libsql";

  return "sqlite";
}

/**
 * Assert the configured driver is implemented.
 * sqlite (local file) and libsql (Turso / remote) are supported via @libsql/client + libsql.
 */
export function assertDatabaseDriverSupported(): DatabaseDriver {
  const driver = resolveDatabaseDriver();
  if (driver === "postgres") {
    throw new Error(
      `DATABASE_DRIVER=${driver} is not implemented yet. ` +
        `Use sqlite (local file, default) or libsql (Turso). ` +
        `See docs/DB_MIGRATION_PATH.md.`,
    );
  }
  return driver;
}
