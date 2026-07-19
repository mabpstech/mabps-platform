import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateWebsiteSchema = createSchemaMigrator("lib/website/schema.sql");
