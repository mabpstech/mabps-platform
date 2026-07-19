-- MABPS AI Guardian (Self-Healing & Diagnostics) schema.
-- Workspace id = organization.id from Better Auth.

CREATE TABLE IF NOT EXISTS "guardian_settings" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "monitoringEnabled" integer not null default 1,
  "autoScanEnabled" integer not null default 1,
  "autoRepairSuggestionsEnabled" integer not null default 1,
  "aiTroubleshootingEnabled" integer not null default 1,
  "securityChecksEnabled" integer not null default 1,
  "performanceChecksEnabled" integer not null default 1,
  "logAnalysisEnabled" integer not null default 1,
  "scanIntervalSec" integer not null default 900,
  "retentionScans" integer not null default 50,
  "alertWebhookUrl" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId")
);

CREATE TABLE IF NOT EXISTS "guardian_scan" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "status" text not null default 'queued',
  "trigger" text not null default 'manual',
  "healthStatus" text not null default 'unknown',
  "categoriesJson" text not null default '[]',
  "summary" text,
  "findingsCount" integer not null default 0,
  "criticalCount" integer not null default 0,
  "highCount" integer not null default 0,
  "mediumCount" integer not null default 0,
  "lowCount" integer not null default 0,
  "durationMs" integer,
  "startedAt" text,
  "finishedAt" text,
  "errorMessage" text,
  "metadataJson" text not null default '{}',
  "createdByUserId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "guardian_scan_workspace_created_idx"
  ON "guardian_scan" ("workspaceId", "createdAt");

CREATE INDEX IF NOT EXISTS "guardian_scan_workspace_status_idx"
  ON "guardian_scan" ("workspaceId", "status");

CREATE TABLE IF NOT EXISTS "guardian_finding" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "scanId" text references "guardian_scan" ("id") on delete set null,
  "category" text not null,
  "code" text not null,
  "title" text not null,
  "description" text not null,
  "severity" text not null default 'medium',
  "status" text not null default 'open',
  "evidenceJson" text not null default '{}',
  "suggestion" text,
  "autoRepairable" integer not null default 0,
  "resolvedAt" text,
  "resolvedByUserId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "guardian_finding_workspace_status_idx"
  ON "guardian_finding" ("workspaceId", "status");

CREATE INDEX IF NOT EXISTS "guardian_finding_workspace_severity_idx"
  ON "guardian_finding" ("workspaceId", "severity");

CREATE INDEX IF NOT EXISTS "guardian_finding_scan_idx"
  ON "guardian_finding" ("scanId");

CREATE TABLE IF NOT EXISTS "guardian_repair" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "findingId" text references "guardian_finding" ("id") on delete set null,
  "scanId" text references "guardian_scan" ("id") on delete set null,
  "action" text not null default 'custom',
  "title" text not null,
  "description" text not null,
  "status" text not null default 'suggested',
  "oneClick" integer not null default 0,
  "riskLevel" text not null default 'low',
  "stepsJson" text not null default '[]',
  "resultSummary" text,
  "errorMessage" text,
  "appliedAt" text,
  "appliedByUserId" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "guardian_repair_workspace_status_idx"
  ON "guardian_repair" ("workspaceId", "status");

CREATE INDEX IF NOT EXISTS "guardian_repair_finding_idx"
  ON "guardian_repair" ("findingId");

CREATE TABLE IF NOT EXISTS "guardian_check_result" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "scanId" text not null references "guardian_scan" ("id") on delete cascade,
  "category" text not null,
  "checkKey" text not null,
  "title" text not null,
  "status" text not null default 'pass',
  "severity" text not null default 'info',
  "message" text not null,
  "latencyMs" integer,
  "detailsJson" text not null default '{}',
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "guardian_check_result_scan_idx"
  ON "guardian_check_result" ("scanId", "category");

CREATE TABLE IF NOT EXISTS "guardian_monitor_event" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "scanId" text,
  "findingId" text,
  "repairId" text,
  "type" text not null,
  "severity" text not null default 'info',
  "title" text not null,
  "message" text,
  "metadataJson" text not null default '{}',
  "occurredAt" text not null,
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "guardian_monitor_event_workspace_occurred_idx"
  ON "guardian_monitor_event" ("workspaceId", "occurredAt");

CREATE TABLE IF NOT EXISTS "guardian_op_log" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "scanId" text,
  "findingId" text,
  "repairId" text,
  "operation" text not null,
  "status" text not null default 'success',
  "requestSummary" text,
  "responseSummary" text,
  "errorMessage" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "guardian_op_log_workspace_created_idx"
  ON "guardian_op_log" ("workspaceId", "createdAt");
