/**
 * libSQL's sync `Database` is better-sqlite3 compatible, but `.get()` attaches
 * a non-column `_metadata` field. Strip it so repository code sees plain rows.
 */

export function stripRowMetadata<T>(row: T): T {
  if (row && typeof row === "object" && !Array.isArray(row) && "_metadata" in row) {
    const { _metadata: _ignored, ...rest } = row as Record<string, unknown>;
    return rest as T;
  }
  return row;
}

/** Wrap a libSQL Database so `.prepare().get()` matches better-sqlite3 row shape. */
export function wrapLibsqlDatabase<T>(db: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = db as any;
  return new Proxy(target, {
    get(dbTarget, prop, receiver) {
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
  }) as T;
}
