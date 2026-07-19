import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateKnowledgeSchema = createSchemaMigrator("lib/knowledge/schema.sql");
