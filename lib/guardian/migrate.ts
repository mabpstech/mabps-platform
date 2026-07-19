import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateGuardianSchema = createSchemaMigrator("lib/guardian/schema.sql");
