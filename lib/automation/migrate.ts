import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateAutomationSchema = createSchemaMigrator("lib/automation/schema.sql");
