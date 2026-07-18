-- MABPS Automation Engine schema.
-- Workspace id = organization.id from Better Auth.

CREATE TABLE IF NOT EXISTS "automation_workflow" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "slug" text not null,
  "description" text,
  "status" text not null default 'draft',
  "triggerType" text not null,
  "triggerConfigJson" text not null default '{}',
  "definitionJson" text not null default '[]',
  "webhookSecret" text,
  "apiKey" text,
  "version" integer not null default 1,
  "lastRunAt" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId", "slug")
);

CREATE INDEX IF NOT EXISTS "automation_workflow_workspace_status_idx"
  ON "automation_workflow" ("workspaceId", "status");

CREATE INDEX IF NOT EXISTS "automation_workflow_trigger_idx"
  ON "automation_workflow" ("workspaceId", "triggerType", "status");

CREATE INDEX IF NOT EXISTS "automation_workflow_webhook_idx"
  ON "automation_workflow" ("webhookSecret");

CREATE INDEX IF NOT EXISTS "automation_workflow_api_key_idx"
  ON "automation_workflow" ("apiKey");

CREATE TABLE IF NOT EXISTS "automation_run" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "workflowId" text not null references "automation_workflow" ("id") on delete cascade,
  "status" text not null default 'queued',
  "triggerType" text not null,
  "triggerPayloadJson" text not null default '{}',
  "contextJson" text not null default '{}',
  "currentNodeId" text,
  "attempt" integer not null default 0,
  "maxAttempts" integer not null default 3,
  "errorMessage" text,
  "queuedAt" text not null,
  "startedAt" text,
  "finishedAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "automation_run_workspace_status_idx"
  ON "automation_run" ("workspaceId", "status");

CREATE INDEX IF NOT EXISTS "automation_run_workflow_created_idx"
  ON "automation_run" ("workflowId", "createdAt");

CREATE TABLE IF NOT EXISTS "automation_run_step" (
  "id" text not null primary key,
  "runId" text not null references "automation_run" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "workflowId" text not null references "automation_workflow" ("id") on delete cascade,
  "nodeId" text not null,
  "nodeType" text not null,
  "nodeKind" text not null,
  "status" text not null default 'pending',
  "attempt" integer not null default 0,
  "inputJson" text not null default '{}',
  "outputJson" text not null default '{}',
  "errorMessage" text,
  "startedAt" text,
  "finishedAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "automation_run_step_run_idx"
  ON "automation_run_step" ("runId", "createdAt");

CREATE TABLE IF NOT EXISTS "automation_run_log" (
  "id" text not null primary key,
  "runId" text not null references "automation_run" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "workflowId" text not null references "automation_workflow" ("id") on delete cascade,
  "runStepId" text,
  "level" text not null default 'info',
  "message" text not null,
  "dataJson" text not null default '{}',
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "automation_run_log_run_idx"
  ON "automation_run_log" ("runId", "createdAt");

CREATE TABLE IF NOT EXISTS "automation_queue_job" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "workflowId" text not null references "automation_workflow" ("id") on delete cascade,
  "runId" text not null references "automation_run" ("id") on delete cascade,
  "jobType" text not null default 'execute_run',
  "status" text not null default 'pending',
  "priority" integer not null default 100,
  "attempt" integer not null default 0,
  "maxAttempts" integer not null default 3,
  "availableAt" text not null,
  "lockedAt" text,
  "lockedBy" text,
  "payloadJson" text not null default '{}',
  "lastError" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "automation_queue_job_poll_idx"
  ON "automation_queue_job" ("status", "availableAt", "priority");

CREATE INDEX IF NOT EXISTS "automation_queue_job_run_idx"
  ON "automation_queue_job" ("runId");

CREATE TABLE IF NOT EXISTS "automation_schedule" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "workflowId" text not null references "automation_workflow" ("id") on delete cascade,
  "cronExpression" text not null,
  "timezone" text not null default 'UTC',
  "isEnabled" integer not null default 1,
  "nextRunAt" text,
  "lastRunAt" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workflowId")
);

CREATE INDEX IF NOT EXISTS "automation_schedule_next_idx"
  ON "automation_schedule" ("isEnabled", "nextRunAt");
