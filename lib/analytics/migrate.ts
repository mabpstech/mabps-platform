import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateAnalyticsSchema = createSchemaMigrator("lib/analytics/schema.sql");
