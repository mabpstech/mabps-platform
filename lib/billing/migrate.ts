import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateBillingSchema = createSchemaMigrator("lib/billing/schema.sql");
