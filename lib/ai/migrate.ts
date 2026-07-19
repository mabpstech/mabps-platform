import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateAiSchema = createSchemaMigrator("lib/ai/schema.sql");
