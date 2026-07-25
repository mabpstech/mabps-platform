/**
 * Turso/libSQL Hrana stream lifecycle for serverless (Vercel).
 *
 * Remote connections are stateful: idle warm instances keep a JS client whose
 * server-side stream has already been closed → `404 stream not found`.
 * Local file DBs do not use Hrana streams and need no recovery.
 */

import type { Client } from "@libsql/client";
import type Database from "libsql";

const HRANA_STREAM_ERROR =
  /stream not found|stream has expired|HRANA_CLOSED|baton not found/i;

export function isHranaStreamError(error: unknown): boolean {
  if (error == null) return false;
  const parts: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 4 && current != null; i++) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return HRANA_STREAM_ERROR.test(parts.join(" "));
}

type SyncDatabase = Database.Database;

/**
 * Stable better-sqlite3-compatible facade that reopens the underlying remote
 * connection once when an expired Hrana stream is detected.
 * Better Auth and repositories keep a single object reference.
 */
export function createReconnectingSqlite(
  open: () => SyncDatabase,
): SyncDatabase {
  let db = open();

  const reopen = () => {
    try {
      db.close();
    } catch {
      // Ignore close failures on already-dead streams.
    }
    db = open();
  };

  const withRetry = <T>(operation: (current: SyncDatabase) => T): T => {
    try {
      return operation(db);
    } catch (error) {
      if (!isHranaStreamError(error)) throw error;
      reopen();
      return operation(db);
    }
  };

  const statementMethods = new Set([
    "get",
    "all",
    "run",
    "iterate",
    "bind",
    "raw",
    "pluck",
    "expand",
    "safeIntegers",
    "columns",
  ]);

  return new Proxy({} as SyncDatabase, {
    get(_target, prop, _receiver) {
      if (prop === "db") {
        return undefined;
      }

      if (prop === "prepare") {
        return (source: string) => {
          let stmt = withRetry((current) => current.prepare(source));

          return new Proxy(stmt, {
            get(_stmtTarget, stmtProp, stmtReceiver) {
              if (
                typeof stmtProp === "string" &&
                statementMethods.has(stmtProp)
              ) {
                return (...args: unknown[]) => {
                  try {
                    const method = Reflect.get(
                      stmt,
                      stmtProp,
                      stmtReceiver,
                    ) as (...a: unknown[]) => unknown;
                    return method.apply(stmt, args);
                  } catch (error) {
                    if (!isHranaStreamError(error)) throw error;
                    reopen();
                    stmt = db.prepare(source);
                    const method = Reflect.get(stmt, stmtProp) as (
                      ...a: unknown[]
                    ) => unknown;
                    return method.apply(stmt, args);
                  }
                };
              }

              const value = Reflect.get(stmt, stmtProp, stmtReceiver);
              return typeof value === "function" ? value.bind(stmt) : value;
            },
          });
        };
      }

      if (prop === "transaction") {
        return (fn: (...args: never[]) => unknown) => {
          const run =
            (mode?: "deferred" | "immediate" | "exclusive") =>
            (...args: never[]) =>
              withRetry((current) => {
                const txn = current.transaction(fn);
                if (!mode) return txn(...args);
                return txn[mode](...args);
              });

          const defaultTxn = run();
          return Object.assign(defaultTxn, {
            deferred: run("deferred"),
            immediate: run("immediate"),
            exclusive: run("exclusive"),
            database: undefined,
          });
        };
      }

      if (
        prop === "exec" ||
        prop === "pragma" ||
        prop === "function" ||
        prop === "aggregate" ||
        prop === "table" ||
        prop === "loadExtension"
      ) {
        return (...args: unknown[]) =>
          withRetry((current) => {
            const method = Reflect.get(current, prop) as (
              ...a: unknown[]
            ) => unknown;
            return method.apply(current, args);
          });
      }

      if (prop === "close") {
        return () => {
          db.close();
        };
      }

      const value = Reflect.get(db, prop);
      return typeof value === "function" ? value.bind(db) : value;
    },
    has(_target, prop) {
      if (prop === "db") return false;
      if (
        prop === "transaction" ||
        prop === "prepare" ||
        prop === "aggregate" ||
        prop === "open" ||
        prop === "close" ||
        prop === "exec" ||
        prop === "pragma"
      ) {
        return true;
      }
      return Reflect.has(db, prop);
    },
  });
}

const CLIENT_RETRY_METHODS = new Set([
  "execute",
  "batch",
  "migrate",
  "executeMultiple",
  "transaction",
  "sync",
]);

/**
 * Wrap `@libsql/client` so expired Hrana streams trigger `reconnect()` and a
 * single retry. Keeps a stable Client reference for callers.
 */
export function createReconnectingLibsqlClient(client: Client): Client {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (typeof prop !== "string" || !CLIENT_RETRY_METHODS.has(prop)) {
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      }

      return async (...args: unknown[]) => {
        const invoke = () => {
          const method = Reflect.get(target, prop) as (
            ...a: unknown[]
          ) => unknown;
          return method.apply(target, args);
        };

        try {
          return await invoke();
        } catch (error) {
          if (!isHranaStreamError(error)) throw error;
          await Promise.resolve(target.reconnect());
          return await invoke();
        }
      };
    },
  });
}
