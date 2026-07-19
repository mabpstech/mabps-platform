import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateMarketplaceSchema = createSchemaMigrator("lib/marketplace/schema.sql");
