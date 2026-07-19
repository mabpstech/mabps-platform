import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateNotificationsSchema = createSchemaMigrator("lib/notifications/schema.sql");
