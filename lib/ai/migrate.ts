import fs from "node:fs";
import path from "node:path";
import { sqlite } from "@/lib/db";

let migrated = false;

export function migrateAiSchema(): void {
  if (migrated) return;
  const schemaPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "lib/ai/schema.sql",
  );
  const schema = fs.readFileSync(schemaPath, "utf8");
  sqlite.exec(schema);
  migrated = true;
}
