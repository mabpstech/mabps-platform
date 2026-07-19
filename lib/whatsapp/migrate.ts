import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateWhatsAppSchema = createSchemaMigrator("lib/whatsapp/schema.sql");
