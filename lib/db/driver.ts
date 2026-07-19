export type DatabaseDriver = "sqlite" | "libsql" | "postgres";

export function resolveDatabaseDriver(): DatabaseDriver {
  const raw = (process.env.DATABASE_DRIVER || "sqlite").trim().toLowerCase();
  if (raw === "libsql" || raw === "turso") return "libsql";
  if (raw === "postgres" || raw === "postgresql" || raw === "pg") {
    return "postgres";
  }
  return "sqlite";
}

/**
 * Assert the configured driver is implemented.
 * libsql/postgres are reserved for the P3-3 cutover path (see docs/DB_MIGRATION_PATH.md).
 */
export function assertDatabaseDriverSupported(): DatabaseDriver {
  const driver = resolveDatabaseDriver();
  if (driver !== "sqlite") {
    throw new Error(
      `DATABASE_DRIVER=${driver} is not implemented yet. ` +
        `Use sqlite (default) until the Postgres/libSQL cutover. ` +
        `See docs/DB_MIGRATION_PATH.md.`,
    );
  }
  return driver;
}
