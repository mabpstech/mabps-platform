-- MABPS WhatsApp Integration schema.
-- Workspace id = organization.id from Better Auth.
-- Meta WhatsApp Cloud API credentials and conversation state are workspace-scoped.

CREATE TABLE IF NOT EXISTS "whatsapp_settings" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "phoneNumberId" text,
  "displayPhoneNumber" text,
  "wabaId" text,
  "accessToken" text,
  "verifyToken" text,
  "apiVersion" text not null default 'v21.0',
  "businessName" text,
  "isConnected" integer not null default 0,
  "crmSyncEnabled" integer not null default 1,
  "chatbotEnabled" integer not null default 1,
  "automationEnabled" integer not null default 1,
  "defaultChatbotBotId" text,
  "webhookPathSecret" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId")
);

CREATE INDEX IF NOT EXISTS "whatsapp_settings_phoneNumberId_idx"
  ON "whatsapp_settings" ("phoneNumberId");

CREATE INDEX IF NOT EXISTS "whatsapp_settings_verifyToken_idx"
  ON "whatsapp_settings" ("verifyToken");

CREATE TABLE IF NOT EXISTS "whatsapp_contact" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "waId" text not null,
  "phone" text not null,
  "profileName" text,
  "crmContactId" text,
  "crmLeadId" text,
  "metadataJson" text not null default '{}',
  "lastMessageAt" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId", "waId")
);

CREATE INDEX IF NOT EXISTS "whatsapp_contact_workspace_phone_idx"
  ON "whatsapp_contact" ("workspaceId", "phone");

CREATE TABLE IF NOT EXISTS "whatsapp_conversation" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "contactId" text not null references "whatsapp_contact" ("id") on delete cascade,
  "waId" text not null,
  "phone" text not null,
  "status" text not null default 'open',
  "chatbotConversationId" text,
  "lastInboundAt" text,
  "lastOutboundAt" text,
  "lastMessageAt" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "whatsapp_conversation_workspace_updated_idx"
  ON "whatsapp_conversation" ("workspaceId", "updatedAt");

CREATE INDEX IF NOT EXISTS "whatsapp_conversation_workspace_waId_idx"
  ON "whatsapp_conversation" ("workspaceId", "waId");

CREATE TABLE IF NOT EXISTS "whatsapp_message" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "conversationId" text not null references "whatsapp_conversation" ("id") on delete cascade,
  "contactId" text not null references "whatsapp_contact" ("id") on delete cascade,
  "direction" text not null,
  "type" text not null default 'text',
  "content" text,
  "mediaId" text,
  "mediaUrl" text,
  "mediaMimeType" text,
  "templateName" text,
  "templateLanguage" text,
  "templateParamsJson" text not null default '[]',
  "status" text not null default 'queued',
  "providerMessageId" text,
  "errorMessage" text,
  "rawJson" text not null default '{}',
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "whatsapp_message_conversation_idx"
  ON "whatsapp_message" ("conversationId", "createdAt");

CREATE INDEX IF NOT EXISTS "whatsapp_message_provider_idx"
  ON "whatsapp_message" ("providerMessageId");

CREATE TABLE IF NOT EXISTS "whatsapp_template" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "language" text not null default 'en_US',
  "category" text,
  "status" text not null default 'PENDING',
  "body" text,
  "componentsJson" text not null default '[]',
  "providerTemplateId" text,
  "isLocal" integer not null default 1,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId", "name", "language")
);

CREATE INDEX IF NOT EXISTS "whatsapp_template_workspace_status_idx"
  ON "whatsapp_template" ("workspaceId", "status");

CREATE TABLE IF NOT EXISTS "whatsapp_media" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "providerMediaId" text,
  "mimeType" text,
  "fileName" text,
  "fileSize" integer,
  "sha256" text,
  "localPath" text,
  "sourceUrl" text,
  "direction" text not null default 'outbound',
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "whatsapp_media_workspace_created_idx"
  ON "whatsapp_media" ("workspaceId", "createdAt");

CREATE TABLE IF NOT EXISTS "whatsapp_broadcast" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "templateName" text not null,
  "templateLanguage" text not null default 'en_US',
  "templateParamsJson" text not null default '[]',
  "status" text not null default 'draft',
  "totalRecipients" integer not null default 0,
  "sentCount" integer not null default 0,
  "failedCount" integer not null default 0,
  "scheduledAt" text,
  "startedAt" text,
  "completedAt" text,
  "createdByUserId" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "whatsapp_broadcast_workspace_status_idx"
  ON "whatsapp_broadcast" ("workspaceId", "status");

CREATE TABLE IF NOT EXISTS "whatsapp_broadcast_recipient" (
  "id" text not null primary key,
  "broadcastId" text not null references "whatsapp_broadcast" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "contactId" text references "whatsapp_contact" ("id") on delete set null,
  "phone" text not null,
  "status" text not null default 'pending',
  "providerMessageId" text,
  "errorMessage" text,
  "sentAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "whatsapp_broadcast_recipient_broadcast_idx"
  ON "whatsapp_broadcast_recipient" ("broadcastId", "status");

CREATE TABLE IF NOT EXISTS "whatsapp_log" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "operation" text not null,
  "status" text not null default 'success',
  "direction" text,
  "phone" text,
  "conversationId" text,
  "messageId" text,
  "providerMessageId" text,
  "latencyMs" integer,
  "errorMessage" text,
  "requestSummary" text,
  "responseSummary" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "whatsapp_log_workspace_created_idx"
  ON "whatsapp_log" ("workspaceId", "createdAt");
