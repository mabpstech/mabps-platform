import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateEmailEngineSchema = createSchemaMigrator("lib/email-engine/schema.sql");
