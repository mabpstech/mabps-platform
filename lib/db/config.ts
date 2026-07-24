import fs from "node:fs";
import path from "node:path";
import type { Config } from "@libsql/client";
import { resolveDatabaseDriver } from "@/lib/db/driver";

export function isRemoteLibsqlUrl(url: string): boolean {
  return /^(libsql:|https?:\/\/|wss?:\/\/)/i.test(url.trim());
}

export function resolveAuthToken(): string | undefined {
  const token =
    process.env.AUTH_TOKEN?.trim() ||
    process.env.TURSO_AUTH_TOKEN?.trim() ||
    undefined;
  return token || undefined;
}

/**
 * Resolve local filesystem path for file-backed SQLite / libSQL.
 * Accepts relative paths, absolute paths, and `file:` URLs.
 */
export function resolveLocalDatabasePath(
  databaseUrl: string | undefined,
  cwd: string = process.cwd(),
): string {
  const dataDir = path.join(/* turbopackIgnore: true */ cwd, "data");
  if (!databaseUrl) {
    return path.join(dataDir, "mabps.db");
  }

  const stripped = databaseUrl.replace(/^file:/i, "");
  if (path.isAbsolute(stripped)) {
    return stripped;
  }
  return path.join(/* turbopackIgnore: true */ cwd, stripped);
}

export type ResolvedDatabaseConnection =
  | {
      mode: "remote";
      url: string;
      authToken: string;
      libsqlConfig: Config;
    }
  | {
      mode: "local";
      path: string;
      url: string;
      libsqlConfig: Config;
    };

/**
 * Build connection settings from env.
 * - Local (dev): file path / `file:` URL → embedded libSQL
 * - Production: `libsql://` / `https://` Turso URL + AUTH_TOKEN
 */
export function resolveDatabaseConnection(
  cwd: string = process.cwd(),
): ResolvedDatabaseConnection {
  const driver = resolveDatabaseDriver();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const authToken = resolveAuthToken();

  if (driver === "postgres") {
    throw new Error(
      "DATABASE_DRIVER=postgres is not implemented in the libSQL connection layer. " +
        "Use sqlite (local) or libsql (Turso). See docs/DB_MIGRATION_PATH.md.",
    );
  }

  if (databaseUrl && isRemoteLibsqlUrl(databaseUrl)) {
    if (!authToken) {
      throw new Error(
        "AUTH_TOKEN is required when DATABASE_URL points at a remote Turso/libSQL database.",
      );
    }
    const libsqlConfig: Config = {
      url: databaseUrl,
      authToken,
    };
    return {
      mode: "remote",
      url: databaseUrl,
      authToken,
      libsqlConfig,
    };
  }

  if (driver === "libsql" && !databaseUrl) {
    throw new Error(
      "DATABASE_DRIVER=libsql requires DATABASE_URL (local file path or remote libsql/https URL).",
    );
  }

  const filePath = resolveLocalDatabasePath(databaseUrl, cwd);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const fileUrl = path.isAbsolute(filePath)
    ? `file://${filePath}`
    : `file:${filePath}`;

  const libsqlConfig: Config = {
    url: fileUrl,
  };

  return {
    mode: "local",
    path: filePath,
    url: fileUrl,
    libsqlConfig,
  };
}
