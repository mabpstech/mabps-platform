-- MABPS CRM schema.
-- Workspace id = organization.id from Better Auth.

CREATE TABLE IF NOT EXISTS "crm_company" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "domain" text,
  "industry" text,
  "phone" text,
  "email" text,
  "website" text,
  "address" text,
  "city" text,
  "state" text,
  "country" text,
  "postalCode" text,
  "description" text,
  "ownerUserId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "crm_contact" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "companyId" text references "crm_company" ("id") on delete set null,
  "firstName" text not null,
  "lastName" text not null default '',
  "email" text,
  "phone" text,
  "jobTitle" text,
  "status" text not null default 'active',
  "ownerUserId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "crm_lead" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "companyId" text references "crm_company" ("id") on delete set null,
  "contactId" text references "crm_contact" ("id") on delete set null,
  "firstName" text not null,
  "lastName" text not null default '',
  "email" text,
  "phone" text,
  "companyName" text,
  "jobTitle" text,
  "source" text not null default 'manual',
  "status" text not null default 'new',
  "score" integer not null default 0,
  "ownerUserId" text,
  "convertedAt" text,
  "convertedCustomerId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "crm_customer" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "contactId" text references "crm_contact" ("id") on delete set null,
  "companyId" text references "crm_company" ("id") on delete set null,
  "displayName" text not null,
  "email" text,
  "phone" text,
  "status" text not null default 'active',
  "lifecycleStage" text not null default 'customer',
  "ownerUserId" text,
  "acquiredAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "crm_pipeline" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "isDefault" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "crm_pipeline_stage" (
  "id" text not null primary key,
  "pipelineId" text not null references "crm_pipeline" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "sortOrder" integer not null default 0,
  "color" text not null default '#71717a',
  "probability" integer not null default 0,
  "isWon" integer not null default 0,
  "isLost" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "crm_deal" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "pipelineId" text not null references "crm_pipeline" ("id") on delete cascade,
  "stageId" text not null references "crm_pipeline_stage" ("id") on delete restrict,
  "title" text not null,
  "amountCents" integer not null default 0,
  "currency" text not null default 'USD',
  "contactId" text references "crm_contact" ("id") on delete set null,
  "companyId" text references "crm_company" ("id") on delete set null,
  "customerId" text references "crm_customer" ("id") on delete set null,
  "leadId" text references "crm_lead" ("id") on delete set null,
  "ownerUserId" text,
  "expectedCloseDate" text,
  "closedAt" text,
  "status" text not null default 'open',
  "probability" integer not null default 0,
  "description" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "crm_note" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "entityType" text not null,
  "entityId" text not null,
  "body" text not null,
  "createdByUserId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "crm_activity" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "entityType" text not null,
  "entityId" text not null,
  "type" text not null,
  "subject" text not null,
  "body" text,
  "occurredAt" text not null,
  "createdByUserId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "crm_task" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "entityType" text,
  "entityId" text,
  "title" text not null,
  "description" text,
  "status" text not null default 'open',
  "priority" text not null default 'medium',
  "dueAt" text,
  "assigneeUserId" text,
  "createdByUserId" text,
  "completedAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "crm_tag" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "color" text not null default '#3f3f46',
  "createdAt" text not null,
  "updatedAt" text not null,
  unique ("workspaceId", "name")
);

CREATE TABLE IF NOT EXISTS "crm_tag_link" (
  "tagId" text not null references "crm_tag" ("id") on delete cascade,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "entityType" text not null,
  "entityId" text not null,
  "createdAt" text not null,
  primary key ("tagId", "entityType", "entityId")
);

CREATE TABLE IF NOT EXISTS "crm_timeline_event" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "customerId" text not null references "crm_customer" ("id") on delete cascade,
  "entityType" text not null,
  "entityId" text,
  "eventType" text not null,
  "title" text not null,
  "summary" text,
  "metadata" text not null default '{}',
  "actorUserId" text,
  "occurredAt" text not null,
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "crm_company_workspaceId_idx" on "crm_company" ("workspaceId");
CREATE INDEX IF NOT EXISTS "crm_company_name_idx" on "crm_company" ("workspaceId", "name");
CREATE INDEX IF NOT EXISTS "crm_contact_workspaceId_idx" on "crm_contact" ("workspaceId");
CREATE INDEX IF NOT EXISTS "crm_contact_companyId_idx" on "crm_contact" ("companyId");
CREATE INDEX IF NOT EXISTS "crm_contact_email_idx" on "crm_contact" ("workspaceId", "email");
CREATE INDEX IF NOT EXISTS "crm_lead_workspaceId_idx" on "crm_lead" ("workspaceId");
CREATE INDEX IF NOT EXISTS "crm_lead_status_idx" on "crm_lead" ("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "crm_customer_workspaceId_idx" on "crm_customer" ("workspaceId");
CREATE INDEX IF NOT EXISTS "crm_customer_status_idx" on "crm_customer" ("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "crm_pipeline_workspaceId_idx" on "crm_pipeline" ("workspaceId");
CREATE INDEX IF NOT EXISTS "crm_pipeline_stage_pipelineId_idx" on "crm_pipeline_stage" ("pipelineId");
CREATE INDEX IF NOT EXISTS "crm_deal_workspaceId_idx" on "crm_deal" ("workspaceId");
CREATE INDEX IF NOT EXISTS "crm_deal_stageId_idx" on "crm_deal" ("stageId");
CREATE INDEX IF NOT EXISTS "crm_deal_customerId_idx" on "crm_deal" ("customerId");
CREATE INDEX IF NOT EXISTS "crm_deal_status_idx" on "crm_deal" ("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "crm_note_entity_idx" on "crm_note" ("workspaceId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "crm_activity_entity_idx" on "crm_activity" ("workspaceId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "crm_activity_occurredAt_idx" on "crm_activity" ("workspaceId", "occurredAt");
CREATE INDEX IF NOT EXISTS "crm_task_workspaceId_idx" on "crm_task" ("workspaceId");
CREATE INDEX IF NOT EXISTS "crm_task_status_idx" on "crm_task" ("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "crm_task_dueAt_idx" on "crm_task" ("workspaceId", "dueAt");
CREATE INDEX IF NOT EXISTS "crm_tag_workspaceId_idx" on "crm_tag" ("workspaceId");
CREATE INDEX IF NOT EXISTS "crm_tag_link_entity_idx" on "crm_tag_link" ("workspaceId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "crm_timeline_customer_idx" on "crm_timeline_event" ("customerId", "occurredAt");
CREATE INDEX IF NOT EXISTS "crm_timeline_workspaceId_idx" on "crm_timeline_event" ("workspaceId");
