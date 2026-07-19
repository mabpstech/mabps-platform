-- MABPS Deployment & Infrastructure schema.
-- Workspace id = organization.id from Better Auth.
-- Projects, domains, env vars, and deployments are workspace-scoped.

CREATE TABLE IF NOT EXISTS "deployment_settings" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "defaultProvider" text not null default 'vercel',
  "autoSslEnabled" integer not null default 1,
  "autoDnsVerifyEnabled" integer not null default 1,
  "healthChecksEnabled" integer not null default 1,
  "monitoringEnabled" integer not null default 1,
  "publishOnDomainVerify" integer not null default 0,
  "healthCheckIntervalSec" integer not null default 300,
  "healthCheckPath" text not null default '/',
  "healthCheckTimeoutMs" integer not null default 10000,
  "retentionDeployments" integer not null default 50,
  "vercelTeamId" text,
  "vercelToken" text,
  "cloudflareAccountId" text,
  "cloudflareApiToken" text,
  "cloudflareZoneId" text,
  "webhookUrl" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId")
);

CREATE TABLE IF NOT EXISTS "deployment_project" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "slug" text not null,
  "provider" text not null default 'vercel',
  "status" text not null default 'active',
  "siteId" text,
  "productionBranch" text not null default 'main',
  "framework" text not null default 'nextjs',
  "rootDirectory" text not null default '/',
  "buildCommand" text,
  "outputDirectory" text,
  "vercelProjectId" text,
  "cloudflareProjectName" text,
  "currentDeploymentId" text,
  "lastPublishedAt" text,
  "metadataJson" text not null default '{}',
  "createdByUserId" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("workspaceId", "slug")
);

CREATE INDEX IF NOT EXISTS "deployment_project_workspace_status_idx"
  ON "deployment_project" ("workspaceId", "status");

CREATE TABLE IF NOT EXISTS "deployment_domain" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "projectId" text not null references "deployment_project" ("id") on delete cascade,
  "hostname" text not null,
  "status" text not null default 'pending',
  "isPrimary" integer not null default 0,
  "verificationMethod" text not null default 'txt',
  "verificationToken" text not null,
  "verifiedAt" text,
  "dnsProvider" text not null default 'manual',
  "cnameTarget" text,
  "aRecordTarget" text,
  "sslStatus" text not null default 'pending',
  "sslProvider" text not null default 'auto',
  "sslIssuedAt" text,
  "sslExpiresAt" text,
  "lastDnsCheckAt" text,
  "lastDnsError" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("hostname")
);

CREATE INDEX IF NOT EXISTS "deployment_domain_workspace_project_idx"
  ON "deployment_domain" ("workspaceId", "projectId");

CREATE INDEX IF NOT EXISTS "deployment_domain_workspace_status_idx"
  ON "deployment_domain" ("workspaceId", "status");

CREATE TABLE IF NOT EXISTS "deployment_env_var" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "projectId" text not null references "deployment_project" ("id") on delete cascade,
  "key" text not null,
  "value" text not null,
  "isSecret" integer not null default 1,
  "target" text not null default 'production',
  "createdAt" text not null,
  "updatedAt" text not null,
  UNIQUE ("projectId", "key", "target")
);

CREATE INDEX IF NOT EXISTS "deployment_env_var_workspace_project_idx"
  ON "deployment_env_var" ("workspaceId", "projectId");

CREATE TABLE IF NOT EXISTS "deployment" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "projectId" text not null references "deployment_project" ("id") on delete cascade,
  "status" text not null default 'queued',
  "provider" text not null default 'vercel',
  "environment" text not null default 'production',
  "trigger" text not null default 'manual',
  "commitSha" text,
  "commitMessage" text,
  "branch" text,
  "url" text,
  "inspectorUrl" text,
  "providerDeploymentId" text,
  "previousDeploymentId" text,
  "isRollback" integer not null default 0,
  "rolledBackFromId" text,
  "buildStartedAt" text,
  "buildFinishedAt" text,
  "publishedAt" text,
  "failedAt" text,
  "errorMessage" text,
  "durationMs" integer,
  "metadataJson" text not null default '{}',
  "createdByUserId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE INDEX IF NOT EXISTS "deployment_workspace_created_idx"
  ON "deployment" ("workspaceId", "createdAt");

CREATE INDEX IF NOT EXISTS "deployment_project_status_idx"
  ON "deployment" ("projectId", "status");

CREATE TABLE IF NOT EXISTS "deployment_build_log" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "deploymentId" text not null references "deployment" ("id") on delete cascade,
  "level" text not null default 'info',
  "message" text not null,
  "sequence" integer not null default 0,
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "deployment_build_log_deployment_seq_idx"
  ON "deployment_build_log" ("deploymentId", "sequence");

CREATE TABLE IF NOT EXISTS "deployment_health_check" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "projectId" text not null references "deployment_project" ("id") on delete cascade,
  "domainId" text references "deployment_domain" ("id") on delete set null,
  "deploymentId" text references "deployment" ("id") on delete set null,
  "url" text not null,
  "status" text not null default 'unknown',
  "httpStatus" integer,
  "latencyMs" integer,
  "errorMessage" text,
  "checkedAt" text not null,
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "deployment_health_check_workspace_checked_idx"
  ON "deployment_health_check" ("workspaceId", "checkedAt");

CREATE INDEX IF NOT EXISTS "deployment_health_check_project_idx"
  ON "deployment_health_check" ("projectId", "checkedAt");

CREATE TABLE IF NOT EXISTS "deployment_monitor_event" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "projectId" text,
  "deploymentId" text,
  "domainId" text,
  "type" text not null,
  "severity" text not null default 'info',
  "title" text not null,
  "message" text,
  "metadataJson" text not null default '{}',
  "occurredAt" text not null,
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "deployment_monitor_event_workspace_occurred_idx"
  ON "deployment_monitor_event" ("workspaceId", "occurredAt");

CREATE TABLE IF NOT EXISTS "deployment_log" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "projectId" text,
  "deploymentId" text,
  "operation" text not null,
  "status" text not null default 'success',
  "requestSummary" text,
  "responseSummary" text,
  "errorMessage" text,
  "metadataJson" text not null default '{}',
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "deployment_log_workspace_created_idx"
  ON "deployment_log" ("workspaceId", "createdAt");
