import fs from "node:fs";
import path from "node:path";
import { sqlite } from "@/lib/db";

/**
 * Idempotent schema bootstrap for a module SQL file under the repo root.
 * Example: createSchemaMigrator("lib/crm/schema.sql")
 */
export function createSchemaMigrator(relativeSchemaPath: string): () => void {
  let migrated = false;

  return () => {
    if (migrated) return;

    const schemaPath = path.join(
      /* turbopackIgnore: true */ process.cwd(),
      relativeSchemaPath,
    );
    const schema = fs.readFileSync(schemaPath, "utf8");
    sqlite.exec(schema);
    migrated = true;
  };
}
