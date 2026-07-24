/**
 * libSQL's sync `Database` is better-sqlite3 compatible, but:
 * 1. `.get()` attaches a non-column `_metadata` field — strip it.
 * 2. The internal `.db` handle makes Better Auth's Kysely adapter mis-detect the
 *    instance as `{ db: Kysely }` and call `.transaction()` on the native object
 *    (`TypeError: e.transaction is not a function` on signup / workspace create).
 * 3. Guarantees a better-sqlite3-style `.transaction(fn)` that works on local
 *    and remote libSQL (BEGIN / COMMIT / ROLLBACK).
 */

type VariableArgFunction = (...args: never[]) => unknown;

type TransactionFn<F extends VariableArgFunction> = ((
  ...args: Parameters<F>
) => ReturnType<F>) & {
  deferred: (...args: Parameters<F>) => ReturnType<F>;
  immediate: (...args: Parameters<F>) => ReturnType<F>;
  exclusive: (...args: Parameters<F>) => ReturnType<F>;
};

type ExecCapable = {
  exec: (source: string) => unknown;
  transaction?: (fn: VariableArgFunction) => TransactionFn<VariableArgFunction>;
};

export function stripRowMetadata<T>(row: T): T {
  if (row && typeof row === "object" && !Array.isArray(row) && "_metadata" in row) {
    const { _metadata: _ignored, ...rest } = row as Record<string, unknown>;
    return rest as T;
  }
  return row;
}

/**
 * better-sqlite3-compatible transaction wrapper using explicit SQL boundaries.
 * Same call shape: `const run = db.transaction(fn); run(...args)`.
 */
export function createLibsqlTransaction<F extends VariableArgFunction>(
  db: ExecCapable,
  fn: F,
): TransactionFn<F> {
  if (typeof fn !== "function") {
    throw new TypeError("Expected first argument to be a function");
  }

  const wrapTxn = (mode: string) => {
    return (...bindParameters: Parameters<F>): ReturnType<F> => {
      db.exec(`BEGIN ${mode}`.trimEnd());
      try {
        const result = fn(...bindParameters) as ReturnType<F>;
        db.exec("COMMIT");
        return result;
      } catch (err) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // Ignore rollback failures (e.g. no active transaction).
        }
        throw err;
      }
    };
  };

  const deferred = wrapTxn("DEFERRED");
  const immediate = wrapTxn("IMMEDIATE");
  const exclusive = wrapTxn("EXCLUSIVE");
  const defaultTxn = wrapTxn("");

  const properties = {
    deferred: { value: deferred },
    immediate: { value: immediate },
    exclusive: { value: exclusive },
    database: { value: db, enumerable: true },
  };
  Object.defineProperties(defaultTxn, properties);
  Object.defineProperties(deferred, properties);
  Object.defineProperties(immediate, properties);
  Object.defineProperties(exclusive, properties);

  return defaultTxn as TransactionFn<F>;
}

/** Wrap a libSQL Database for Better Auth + repository better-sqlite3 APIs. */
export function wrapLibsqlDatabase<T>(db: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = db as any;

  const transaction = <F extends VariableArgFunction>(fn: F): TransactionFn<F> =>
    createLibsqlTransaction(target as ExecCapable, fn);

  return new Proxy(target, {
    get(dbTarget, prop, receiver) {
      // Hide native handle — Better Auth treats `{ db }` as a Kysely instance.
      if (prop === "db") {
        return undefined;
      }

      if (prop === "transaction") {
        return transaction;
      }

      if (prop === "prepare") {
        return (source: string) => {
          const stmt = dbTarget.prepare(source);
          return new Proxy(stmt, {
            get(stmtTarget, stmtProp, stmtReceiver) {
              if (stmtProp === "get") {
                return (...params: unknown[]) =>
                  stripRowMetadata(stmtTarget.get(...params));
              }
              const value = Reflect.get(stmtTarget, stmtProp, stmtReceiver);
              return typeof value === "function"
                ? value.bind(stmtTarget)
                : value;
            },
          });
        };
      }

      const value = Reflect.get(dbTarget, prop, receiver);
      return typeof value === "function" ? value.bind(dbTarget) : value;
    },
    has(dbTarget, prop) {
      if (prop === "db") return false;
      if (prop === "transaction") return true;
      return Reflect.has(dbTarget, prop);
    },
    getOwnPropertyDescriptor(dbTarget, prop) {
      if (prop === "db") return undefined;
      if (prop === "transaction") {
        return {
          configurable: true,
          enumerable: false,
          writable: false,
          value: transaction,
        };
      }
      return Reflect.getOwnPropertyDescriptor(dbTarget, prop);
    },
  }) as T;
}
