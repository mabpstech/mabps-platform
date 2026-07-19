import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateDeploymentSchema = createSchemaMigrator("lib/deployment/schema.sql");
