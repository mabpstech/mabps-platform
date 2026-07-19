-- MABPS AI Assistant schema.
-- Workspace id = organization.id from Better Auth.

CREATE TABLE IF NOT EXISTS "ai_settings" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "defaultProvider" text not null default 'openai',
  "defaultModel" text,
  "temperature" real not null default 0.4,
  "streamingEnabled" integer not null default 1,
  "toolsEnabled" integer not null default 1,
  "systemPromptId" text,
  "maxToolRounds" integer not null default 3,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId")
);

CREATE TABLE IF NOT EXISTS "ai_provider_credential" (
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

CREATE TABLE IF NOT EXISTS "ai_prompt" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "slug" text not null,
  "name" text not null,
  "kind" text not null default 'workspace',
  "content" text not null,
  "description" text,
  "isDefault" integer not null default 0,
  "isActive" integer not null default 1,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId", "slug")
);

CREATE INDEX IF NOT EXISTS "ai_prompt_workspace_kind_idx"
  ON "ai_prompt" ("workspaceId", "kind");

CREATE TABLE IF NOT EXISTS "ai_conversation" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "userId" text not null,
  "title" text not null default 'New chat',
  "provider" text,
  "model" text,
  "status" text not null default 'active',
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "ai_conversation_workspace_user_idx"
  ON "ai_conversation" ("workspaceId", "userId");

CREATE TABLE IF NOT EXISTS "ai_message" (
  "id" text not null primary key,
  "conversationId" text not null references "ai_conversation" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "role" text not null,
  "content" text not null,
  "toolName" text,
  "toolCallId" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "ai_message_conversation_idx"
  ON "ai_message" ("conversationId", "createdAt");

CREATE TABLE IF NOT EXISTS "ai_log" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "conversationId" text,
  "userId" text,
  "provider" text not null,
  "model" text not null,
  "operation" text not null default 'chat',
  "status" text not null default 'success',
  "inputTokens" integer not null default 0,
  "outputTokens" integer not null default 0,
  "totalTokens" integer not null default 0,
  "credits" integer not null default 0,
  "latencyMs" integer,
  "errorMessage" text,
  "requestSummary" text,
  "responseSummary" text,
  "toolNamesJson" text not null default '[]',
  "metadataJson" text not null default '{}',
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "ai_log_workspace_created_idx"
  ON "ai_log" ("workspaceId", "createdAt");

CREATE INDEX IF NOT EXISTS "ai_log_workspace_provider_idx"
  ON "ai_log" ("workspaceId", "provider");
