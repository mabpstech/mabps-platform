import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateMemorySchema = createSchemaMigrator("lib/memory/schema.sql");
