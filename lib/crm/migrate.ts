import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateCrmSchema = createSchemaMigrator("lib/crm/schema.sql");
