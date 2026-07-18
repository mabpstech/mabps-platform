-- MABPS Chatbot / AI schema.
-- Workspace id = organization.id from Better Auth.

CREATE TABLE IF NOT EXISTS "chatbot_bot" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "slug" text not null,
  "description" text,
  "systemPrompt" text not null default '',
  "welcomeMessage" text not null default 'Hi! How can I help you today?',
  "fallbackMessage" text not null default 'I am not sure about that. Would you like to talk to a human?',
  "provider" text not null default 'openai',
  "model" text,
  "temperature" real not null default 0.4,
  "status" text not null default 'draft',
  "leadCaptureEnabled" integer not null default 1,
  "handoffEnabled" integer not null default 1,
  "memoryEnabled" integer not null default 1,
  "publicKey" text not null,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId", "slug"),
  UNIQUE ("publicKey")
);

CREATE TABLE IF NOT EXISTS "chatbot_provider_credential" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "provider" text not null,
  "apiKey" text not null,
  "baseUrl" text,
  "defaultModel" text,
  "isActive" integer not null default 1,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId", "provider")
);

CREATE TABLE IF NOT EXISTS "chatbot_widget" (
  "id" text not null primary key,
  "botId" text not null references "chatbot_bot" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "title" text not null default 'Chat with us',
  "primaryColor" text not null default '#18181b',
  "position" text not null default 'bottom-right',
  "launcherLabel" text not null default 'Chat',
  "allowedOrigins" text,
  "isEnabled" integer not null default 1,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("botId")
);

CREATE TABLE IF NOT EXISTS "chatbot_channel" (
  "id" text not null primary key,
  "botId" text not null references "chatbot_bot" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "channel" text not null,
  "status" text not null default 'disabled',
  "configJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("botId", "channel")
);

CREATE TABLE IF NOT EXISTS "chatbot_knowledge_source" (
  "id" text not null primary key,
  "botId" text not null references "chatbot_bot" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "type" text not null,
  "title" text not null,
  "status" text not null default 'pending',
  "sourceUrl" text,
  "fileName" text,
  "mimeType" text,
  "storagePath" text,
  "byteSize" integer not null default 0,
  "errorMessage" text,
  "chunkCount" integer not null default 0,
  "lastSyncedAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "chatbot_knowledge_chunk" (
  "id" text not null primary key,
  "sourceId" text not null references "chatbot_knowledge_source" ("id") on delete cascade,
  "botId" text not null references "chatbot_bot" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "chunkIndex" integer not null default 0,
  "content" text not null,
  "tokenEstimate" integer not null default 0,
  "createdAt" text not null
);

CREATE TABLE IF NOT EXISTS "chatbot_conversation" (
  "id" text not null primary key,
  "botId" text not null references "chatbot_bot" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "channel" text not null default 'widget',
  "status" text not null default 'ai',
  "visitorId" text,
  "visitorName" text,
  "visitorEmail" text,
  "visitorPhone" text,
  "externalThreadId" text,
  "crmLeadId" text,
  "assignedUserId" text,
  "handoffReason" text,
  "metadataJson" text not null default '{}',
  "lastMessageAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "chatbot_message" (
  "id" text not null primary key,
  "conversationId" text not null references "chatbot_conversation" ("id") on delete cascade,
  "botId" text not null references "chatbot_bot" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "role" text not null,
  "content" text not null,
  "channel" text not null default 'widget',
  "provider" text,
  "model" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null
);

CREATE TABLE IF NOT EXISTS "chatbot_memory" (
  "id" text not null primary key,
  "botId" text not null references "chatbot_bot" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "visitorKey" text not null,
  "key" text not null,
  "value" text not null,
  "source" text not null default 'conversation',
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("botId", "visitorKey", "key")
);

CREATE TABLE IF NOT EXISTS "chatbot_handoff" (
  "id" text not null primary key,
  "conversationId" text not null references "chatbot_conversation" ("id") on delete cascade,
  "botId" text not null references "chatbot_bot" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "status" text not null default 'requested',
  "reason" text,
  "requestedAt" text not null,
  "claimedByUserId" text,
  "claimedAt" text,
  "resolvedAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "chatbot_bot_workspace_idx"
  ON "chatbot_bot" ("workspaceId");
CREATE INDEX IF NOT EXISTS "chatbot_knowledge_source_bot_idx"
  ON "chatbot_knowledge_source" ("botId");
CREATE INDEX IF NOT EXISTS "chatbot_knowledge_chunk_bot_idx"
  ON "chatbot_knowledge_chunk" ("botId");
CREATE INDEX IF NOT EXISTS "chatbot_conversation_workspace_idx"
  ON "chatbot_conversation" ("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "chatbot_conversation_bot_idx"
  ON "chatbot_conversation" ("botId", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "chatbot_message_conversation_idx"
  ON "chatbot_message" ("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "chatbot_memory_visitor_idx"
  ON "chatbot_memory" ("botId", "visitorKey");
CREATE INDEX IF NOT EXISTS "chatbot_handoff_workspace_idx"
  ON "chatbot_handoff" ("workspaceId", "status");
