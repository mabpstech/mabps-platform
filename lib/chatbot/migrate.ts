import { createSchemaMigrator } from "@/lib/platform/migrate";

export const migrateChatbotSchema = createSchemaMigrator("lib/chatbot/schema.sql");
