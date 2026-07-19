import { randomBytes, randomUUID } from "node:crypto";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import { setUsageValue } from "@/lib/billing/repository";
import { defaultWorkflowDefinition } from "@/lib/automation/defaults";
import { getNextCronRunAt, isValidCronExpression } from "@/lib/automation/engine/schedule";
import { migrateAutomationSchema } from "@/lib/automation/migrate";
import { sqlite } from "@/lib/db";
import type {
  AutomationOverview,
  AutomationQueueJob,
  AutomationRun,
  AutomationRunLog,
  AutomationRunStep,
  AutomationSchedule,
  AutomationWorkflow,
  LogLevel,
  QueueJobStatus,
  RunStatus,
  RunStepStatus,
  TriggerType,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowStatus,
} from "@/lib/automation/types";
import {
  ACTION_TYPES,
  NODE_KINDS,
  TRIGGER_TYPES,
  WORKFLOW_STATUSES,
} from "@/lib/automation/types";

export function ensureAutomationReady(): void {
  migrateAutomationSchema();
}

function nowIso(): string {
  return new Date().toISOString();
}

function boolFromInt(value: unknown): boolean {
  return Number(value) === 1;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "workflow";
}

function uniqueSlug(workspaceId: string, base: string, excludeId?: string): string {
  let candidate = slugify(base);
  let i = 1;
  for (;;) {
    const row = sqlite
      .prepare(
        `SELECT "id" FROM "automation_workflow"
         WHERE "workspaceId" = ? AND "slug" = ? LIMIT 1`,
      )
      .get(workspaceId, candidate) as { id: string } | undefined;
    if (!row || (excludeId && row.id === excludeId)) return candidate;
    i += 1;
    candidate = `${slugify(base)}-${i}`;
  }
}

function isTriggerType(value: unknown): value is TriggerType {
  return typeof value === "string" && (TRIGGER_TYPES as readonly string[]).includes(value);
}

function isWorkflowStatus(value: unknown): value is WorkflowStatus {
  return (
    typeof value === "string" &&
    (WORKFLOW_STATUSES as readonly string[]).includes(value)
  );
}

function normalizeDefinition(raw: unknown, triggerType: TriggerType): WorkflowDefinition {
  const nodes = Array.isArray(raw) ? raw : defaultWorkflowDefinition(triggerType);
  const normalized: WorkflowNode[] = [];

  for (const item of nodes) {
    if (!item || typeof item !== "object") continue;
    const node = item as Record<string, unknown>;
    const kind = node.kind;
    if (typeof kind !== "string" || !(NODE_KINDS as readonly string[]).includes(kind)) {
      continue;
    }
    const id =
      typeof node.id === "string" && node.id.trim()
        ? node.id.trim()
        : randomUUID();
    const name =
      typeof node.name === "string" && node.name.trim()
        ? node.name.trim()
        : kind;
    const config =
      node.config && typeof node.config === "object"
        ? (node.config as Record<string, unknown>)
        : {};

    if (kind === "trigger") {
      const type = isTriggerType(node.type) ? node.type : triggerType;
      normalized.push({ id, name, kind: "trigger", type, config });
      continue;
    }
    if (kind === "condition") {
      const group = config as {
        logic?: "and" | "or";
        rules?: unknown[];
      };
      normalized.push({
        id,
        name,
        kind: "condition",
        type: "condition",
        config: {
          logic: group.logic === "or" ? "or" : "and",
          rules: Array.isArray(group.rules)
            ? group.rules.filter(
                (rule) =>
                  rule &&
                  typeof rule === "object" &&
                  typeof (rule as { path?: unknown }).path === "string",
              ).map((rule) => {
                const r = rule as {
                  path: string;
                  operator?: string;
                  value?: unknown;
                };
                return {
                  path: r.path,
                  operator: (r.operator as never) || "eq",
                  value: r.value,
                };
              })
            : [],
        },
      });
      continue;
    }
    if (kind === "delay") {
      normalized.push({
        id,
        name,
        kind: "delay",
        type: "delay",
        config: {
          seconds: Number(config.seconds ?? 0) || 0,
          minutes: Number(config.minutes ?? 0) || 0,
          hours: Number(config.hours ?? 0) || 0,
        },
      });
      continue;
    }
    if (kind === "wait") {
      normalized.push({
        id,
        name,
        kind: "wait",
        type: "wait",
        config: {
          until: typeof config.until === "string" ? config.until : undefined,
          event: typeof config.event === "string" ? config.event : undefined,
        },
      });
      continue;
    }
    if (kind === "action") {
      const type =
        typeof node.type === "string" &&
        (ACTION_TYPES as readonly string[]).includes(node.type)
          ? (node.type as (typeof ACTION_TYPES)[number])
          : "log";
      normalized.push({ id, name, kind: "action", type, config });
    }
  }

  if (!normalized.some((node) => node.kind === "trigger")) {
    normalized.unshift({
      id: "trigger_1",
      name: "Trigger",
      kind: "trigger",
      type: triggerType,
      config: {},
    });
  }

  return normalized;
}

function rowToWorkflow(row: Record<string, unknown>): AutomationWorkflow {
  const triggerType = isTriggerType(row.triggerType)
    ? row.triggerType
    : "manual";
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description == null ? null : String(row.description),
    status: isWorkflowStatus(row.status) ? row.status : "draft",
    triggerType,
    triggerConfig: parseJson(row.triggerConfigJson, {}),
    definition: normalizeDefinition(parseJson(row.definitionJson, []), triggerType),
    webhookSecret: row.webhookSecret == null ? null : String(row.webhookSecret),
    apiKey: row.apiKey == null ? null : String(row.apiKey),
    version: Number(row.version ?? 1),
    lastRunAt: row.lastRunAt == null ? null : String(row.lastRunAt),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToRun(row: Record<string, unknown>): AutomationRun {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    workflowId: String(row.workflowId),
    status: String(row.status) as RunStatus,
    triggerType: isTriggerType(row.triggerType) ? row.triggerType : "manual",
    triggerPayload: parseJson(row.triggerPayloadJson, {}),
    context: parseJson(row.contextJson, {}),
    currentNodeId: row.currentNodeId == null ? null : String(row.currentNodeId),
    attempt: Number(row.attempt ?? 0),
    maxAttempts: Number(row.maxAttempts ?? 3),
    errorMessage: row.errorMessage == null ? null : String(row.errorMessage),
    queuedAt: String(row.queuedAt),
    startedAt: row.startedAt == null ? null : String(row.startedAt),
    finishedAt: row.finishedAt == null ? null : String(row.finishedAt),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToRunStep(row: Record<string, unknown>): AutomationRunStep {
  return {
    id: String(row.id),
    runId: String(row.runId),
    workspaceId: String(row.workspaceId),
    workflowId: String(row.workflowId),
    nodeId: String(row.nodeId),
    nodeType: String(row.nodeType),
    nodeKind: String(row.nodeKind) as AutomationRunStep["nodeKind"],
    status: String(row.status) as RunStepStatus,
    attempt: Number(row.attempt ?? 0),
    input: parseJson(row.inputJson, {}),
    output: parseJson(row.outputJson, {}),
    errorMessage: row.errorMessage == null ? null : String(row.errorMessage),
    startedAt: row.startedAt == null ? null : String(row.startedAt),
    finishedAt: row.finishedAt == null ? null : String(row.finishedAt),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToLog(row: Record<string, unknown>): AutomationRunLog {
  return {
    id: String(row.id),
    runId: String(row.runId),
    workspaceId: String(row.workspaceId),
    workflowId: String(row.workflowId),
    runStepId: row.runStepId == null ? null : String(row.runStepId),
    level: String(row.level) as LogLevel,
    message: String(row.message),
    data: parseJson(row.dataJson, {}),
    createdAt: String(row.createdAt),
  };
}

function rowToJob(row: Record<string, unknown>): AutomationQueueJob {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    workflowId: String(row.workflowId),
    runId: String(row.runId),
    jobType: String(row.jobType),
    status: String(row.status) as QueueJobStatus,
    priority: Number(row.priority ?? 100),
    attempt: Number(row.attempt ?? 0),
    maxAttempts: Number(row.maxAttempts ?? 3),
    availableAt: String(row.availableAt),
    lockedAt: row.lockedAt == null ? null : String(row.lockedAt),
    lockedBy: row.lockedBy == null ? null : String(row.lockedBy),
    payload: parseJson(row.payloadJson, {}),
    lastError: row.lastError == null ? null : String(row.lastError),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToSchedule(row: Record<string, unknown>): AutomationSchedule {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    workflowId: String(row.workflowId),
    cronExpression: String(row.cronExpression),
    timezone: String(row.timezone ?? "UTC"),
    isEnabled: boolFromInt(row.isEnabled),
    nextRunAt: row.nextRunAt == null ? null : String(row.nextRunAt),
    lastRunAt: row.lastRunAt == null ? null : String(row.lastRunAt),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export function countActiveWorkflows(workspaceId: string): number {
  ensureAutomationReady();
  const row = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM "automation_workflow"
       WHERE "workspaceId" = ? AND "status" = 'active'`,
    )
    .get(workspaceId) as { count: number };
  return Number(row.count ?? 0);
}

function syncAutomationUsage(workspaceId: string): void {
  setUsageValue(
    workspaceId,
    "automations",
    "lifetime",
    countActiveWorkflows(workspaceId),
  );
}

export function getAutomationOverview(workspaceId: string): AutomationOverview {
  ensureAutomationReady();
  const workflows = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM "automation_workflow" WHERE "workspaceId" = ?`,
    )
    .get(workspaceId) as { count: number };
  const active = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM "automation_workflow"
       WHERE "workspaceId" = ? AND "status" = 'active'`,
    )
    .get(workspaceId) as { count: number };
  const runs = sqlite
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN "status" = 'succeeded' THEN 1 ELSE 0 END) as succeeded,
         SUM(CASE WHEN "status" = 'failed' THEN 1 ELSE 0 END) as failed,
         SUM(CASE WHEN "status" IN ('queued', 'running', 'waiting') THEN 1 ELSE 0 END) as queued
       FROM "automation_run" WHERE "workspaceId" = ?`,
    )
    .get(workspaceId) as {
    total: number;
    succeeded: number;
    failed: number;
    queued: number;
  };
  const queue = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM "automation_queue_job"
       WHERE "workspaceId" = ? AND "status" = 'pending'`,
    )
    .get(workspaceId) as { count: number };

  return {
    workflows: Number(workflows.count ?? 0),
    activeWorkflows: Number(active.count ?? 0),
    runsTotal: Number(runs.total ?? 0),
    runsSucceeded: Number(runs.succeeded ?? 0),
    runsFailed: Number(runs.failed ?? 0),
    runsQueued: Number(runs.queued ?? 0),
    queuePending: Number(queue.count ?? 0),
  };
}

export function listWorkflows(
  workspaceId: string,
  filters: { q?: string; status?: string; triggerType?: string } = {},
): AutomationWorkflow[] {
  ensureAutomationReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.triggerType) {
    clauses.push(`"triggerType" = ?`);
    params.push(filters.triggerType);
  }
  if (filters.q) {
    clauses.push(`("name" LIKE ? OR "slug" LIKE ? OR "description" LIKE ?)`);
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }
  const rows = sqlite
    .prepare(
      `SELECT * FROM "automation_workflow"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "updatedAt" DESC`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToWorkflow);
}

export function getWorkflowById(id: string): AutomationWorkflow | null {
  ensureAutomationReady();
  const row = sqlite
    .prepare(`SELECT * FROM "automation_workflow" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToWorkflow(row) : null;
}

export function getWorkflowByWebhookSecret(
  secret: string,
): AutomationWorkflow | null {
  ensureAutomationReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "automation_workflow"
       WHERE "webhookSecret" = ? AND "status" = 'active' LIMIT 1`,
    )
    .get(secret) as Record<string, unknown> | undefined;
  return row ? rowToWorkflow(row) : null;
}

export function getWorkflowByApiKey(apiKey: string): AutomationWorkflow | null {
  ensureAutomationReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "automation_workflow"
       WHERE "apiKey" = ? AND "status" = 'active' LIMIT 1`,
    )
    .get(apiKey) as Record<string, unknown> | undefined;
  return row ? rowToWorkflow(row) : null;
}

export function listActiveWorkflowsByTrigger(
  workspaceId: string,
  triggerType: TriggerType,
): AutomationWorkflow[] {
  ensureAutomationReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "automation_workflow"
       WHERE "workspaceId" = ? AND "triggerType" = ? AND "status" = 'active'
       ORDER BY "createdAt" ASC`,
    )
    .all(workspaceId, triggerType) as Record<string, unknown>[];
  return rows.map(rowToWorkflow);
}

export function createWorkflow(input: {
  workspaceId: string;
  name: string;
  description?: string | null;
  triggerType?: TriggerType;
  triggerConfig?: Record<string, unknown>;
  definition?: WorkflowDefinition;
  status?: WorkflowStatus;
}): AutomationWorkflow {
  ensureAutomationReady();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");

  const triggerType = input.triggerType ?? "manual";
  if (!isTriggerType(triggerType)) throw new Error("Invalid trigger type.");

  const status = input.status ?? "draft";
  if (!isWorkflowStatus(status)) throw new Error("Invalid status.");

  if (status === "active") {
    assertWithinLimit(input.workspaceId, "automations", { delta: 1 });
  }

  const id = randomUUID();
  const timestamp = nowIso();
  const slug = uniqueSlug(input.workspaceId, name);
  const definition = normalizeDefinition(
    input.definition ?? defaultWorkflowDefinition(triggerType),
    triggerType,
  );
  const webhookSecret =
    triggerType === "webhook" ? `whsec_${randomBytes(24).toString("hex")}` : null;
  const apiKey =
    triggerType === "api" ? `atk_${randomBytes(24).toString("hex")}` : null;

  sqlite
    .prepare(
      `INSERT INTO "automation_workflow" (
        "id", "workspaceId", "name", "slug", "description", "status",
        "triggerType", "triggerConfigJson", "definitionJson",
        "webhookSecret", "apiKey", "version", "lastRunAt",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      name,
      slug,
      input.description?.trim() || null,
      status,
      triggerType,
      JSON.stringify(input.triggerConfig ?? {}),
      JSON.stringify(definition),
      webhookSecret,
      apiKey,
      timestamp,
      timestamp,
    );

  if (triggerType === "schedule") {
    const cron =
      typeof input.triggerConfig?.cron === "string"
        ? input.triggerConfig.cron
        : "0 * * * *";
    upsertSchedule({
      workspaceId: input.workspaceId,
      workflowId: id,
      cronExpression: cron,
      timezone:
        typeof input.triggerConfig?.timezone === "string"
          ? input.triggerConfig.timezone
          : "UTC",
      isEnabled: status === "active",
    });
  }

  if (status === "active") syncAutomationUsage(input.workspaceId);
  return getWorkflowById(id)!;
}

export function updateWorkflow(
  id: string,
  workspaceId: string,
  input: Partial<{
    name: string;
    description: string | null;
    status: WorkflowStatus;
    triggerType: TriggerType;
    triggerConfig: Record<string, unknown>;
    definition: WorkflowDefinition;
    rotateWebhookSecret: boolean;
    rotateApiKey: boolean;
  }>,
): AutomationWorkflow {
  ensureAutomationReady();
  const existing = getWorkflowById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Workflow not found.");
  }

  const nextStatus = input.status ?? existing.status;
  if (!isWorkflowStatus(nextStatus)) throw new Error("Invalid status.");

  if (existing.status !== "active" && nextStatus === "active") {
    assertWithinLimit(workspaceId, "automations", { delta: 1 });
  }

  const triggerType = input.triggerType ?? existing.triggerType;
  if (!isTriggerType(triggerType)) throw new Error("Invalid trigger type.");

  const name = input.name?.trim() || existing.name;
  const slug =
    input.name && input.name.trim() !== existing.name
      ? uniqueSlug(workspaceId, name, id)
      : existing.slug;
  const definition = normalizeDefinition(
    input.definition ?? existing.definition,
    triggerType,
  );
  const triggerConfig = input.triggerConfig ?? existing.triggerConfig;

  let webhookSecret = existing.webhookSecret;
  let apiKey = existing.apiKey;
  if (triggerType === "webhook") {
    if (!webhookSecret || input.rotateWebhookSecret) {
      webhookSecret = `whsec_${randomBytes(24).toString("hex")}`;
    }
  } else {
    webhookSecret = null;
  }
  if (triggerType === "api") {
    if (!apiKey || input.rotateApiKey) {
      apiKey = `atk_${randomBytes(24).toString("hex")}`;
    }
  } else {
    apiKey = null;
  }

  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "automation_workflow" SET
        "name" = ?, "slug" = ?, "description" = ?, "status" = ?,
        "triggerType" = ?, "triggerConfigJson" = ?, "definitionJson" = ?,
        "webhookSecret" = ?, "apiKey" = ?, "version" = "version" + 1,
        "updatedAt" = ?
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      name,
      slug,
      input.description === undefined
        ? existing.description
        : input.description?.trim() || null,
      nextStatus,
      triggerType,
      JSON.stringify(triggerConfig),
      JSON.stringify(definition),
      webhookSecret,
      apiKey,
      timestamp,
      id,
      workspaceId,
    );

  if (triggerType === "schedule") {
    const cron =
      typeof triggerConfig.cron === "string"
        ? triggerConfig.cron
        : "0 * * * *";
    upsertSchedule({
      workspaceId,
      workflowId: id,
      cronExpression: cron,
      timezone:
        typeof triggerConfig.timezone === "string"
          ? triggerConfig.timezone
          : "UTC",
      isEnabled: nextStatus === "active",
    });
  } else {
    disableSchedule(id);
  }

  syncAutomationUsage(workspaceId);
  return getWorkflowById(id)!;
}

export function deleteWorkflow(id: string, workspaceId: string): void {
  ensureAutomationReady();
  const existing = getWorkflowById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Workflow not found.");
  }
  sqlite
    .prepare(
      `DELETE FROM "automation_workflow" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(id, workspaceId);
  syncAutomationUsage(workspaceId);
}

export function upsertSchedule(input: {
  workspaceId: string;
  workflowId: string;
  cronExpression: string;
  timezone?: string;
  isEnabled?: boolean;
}): AutomationSchedule {
  ensureAutomationReady();
  if (!isValidCronExpression(input.cronExpression)) {
    throw new Error("Invalid cron expression.");
  }
  const existing = getScheduleByWorkflowId(input.workflowId);
  const timestamp = nowIso();
  const nextRunAt = getNextCronRunAt(input.cronExpression);
  const isEnabled = input.isEnabled ?? true;

  if (existing) {
    sqlite
      .prepare(
        `UPDATE "automation_schedule" SET
          "cronExpression" = ?, "timezone" = ?, "isEnabled" = ?,
          "nextRunAt" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
      )
      .run(
        input.cronExpression,
        input.timezone ?? existing.timezone,
        isEnabled ? 1 : 0,
        isEnabled ? nextRunAt : null,
        timestamp,
        existing.id,
      );
    return getScheduleByWorkflowId(input.workflowId)!;
  }

  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "automation_schedule" (
        "id", "workspaceId", "workflowId", "cronExpression", "timezone",
        "isEnabled", "nextRunAt", "lastRunAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.workflowId,
      input.cronExpression,
      input.timezone ?? "UTC",
      isEnabled ? 1 : 0,
      isEnabled ? nextRunAt : null,
      timestamp,
      timestamp,
    );
  return getScheduleByWorkflowId(input.workflowId)!;
}

export function getScheduleByWorkflowId(
  workflowId: string,
): AutomationSchedule | null {
  ensureAutomationReady();
  const row = sqlite
    .prepare(`SELECT * FROM "automation_schedule" WHERE "workflowId" = ?`)
    .get(workflowId) as Record<string, unknown> | undefined;
  return row ? rowToSchedule(row) : null;
}

function disableSchedule(workflowId: string): void {
  ensureAutomationReady();
  sqlite
    .prepare(
      `UPDATE "automation_schedule"
       SET "isEnabled" = 0, "nextRunAt" = NULL, "updatedAt" = ?
       WHERE "workflowId" = ?`,
    )
    .run(nowIso(), workflowId);
}

export function listDueSchedules(now = new Date()): AutomationSchedule[] {
  ensureAutomationReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "automation_schedule"
       WHERE "isEnabled" = 1 AND "nextRunAt" IS NOT NULL AND "nextRunAt" <= ?
       ORDER BY "nextRunAt" ASC
       LIMIT 100`,
    )
    .all(now.toISOString()) as Record<string, unknown>[];
  return rows.map(rowToSchedule);
}

export function markScheduleFired(
  scheduleId: string,
  cronExpression: string,
): void {
  ensureAutomationReady();
  const timestamp = nowIso();
  const nextRunAt = getNextCronRunAt(cronExpression, new Date(timestamp));
  sqlite
    .prepare(
      `UPDATE "automation_schedule"
       SET "lastRunAt" = ?, "nextRunAt" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(timestamp, nextRunAt, timestamp, scheduleId);
}

export function createRun(input: {
  workspaceId: string;
  workflowId: string;
  triggerType: TriggerType;
  triggerPayload?: Record<string, unknown>;
  maxAttempts?: number;
  availableAt?: string;
  priority?: number;
}): AutomationRun {
  ensureAutomationReady();
  const workflow = getWorkflowById(input.workflowId);
  if (!workflow || workflow.workspaceId !== input.workspaceId) {
    throw new Error("Workflow not found.");
  }

  const id = randomUUID();
  const timestamp = nowIso();
  const context = {
    vars: {},
    steps: {},
  };

  sqlite
    .prepare(
      `INSERT INTO "automation_run" (
        "id", "workspaceId", "workflowId", "status", "triggerType",
        "triggerPayloadJson", "contextJson", "currentNodeId",
        "attempt", "maxAttempts", "errorMessage",
        "queuedAt", "startedAt", "finishedAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, 'queued', ?, ?, ?, NULL, 0, ?, NULL, ?, NULL, NULL, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.workflowId,
      input.triggerType,
      JSON.stringify(input.triggerPayload ?? {}),
      JSON.stringify(context),
      input.maxAttempts ?? 3,
      timestamp,
      timestamp,
      timestamp,
    );

  enqueueJob({
    workspaceId: input.workspaceId,
    workflowId: input.workflowId,
    runId: id,
    availableAt: input.availableAt ?? timestamp,
    priority: input.priority ?? 100,
    maxAttempts: input.maxAttempts ?? 3,
  });

  sqlite
    .prepare(
      `UPDATE "automation_workflow"
       SET "lastRunAt" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(timestamp, timestamp, input.workflowId);

  return getRunById(id)!;
}

export function getRunById(id: string): AutomationRun | null {
  ensureAutomationReady();
  const row = sqlite
    .prepare(`SELECT * FROM "automation_run" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToRun(row) : null;
}

export function listRuns(
  workspaceId: string,
  filters: {
    workflowId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {},
): AutomationRun[] {
  ensureAutomationReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.workflowId) {
    clauses.push(`"workflowId" = ?`);
    params.push(filters.workflowId);
  }
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const rows = sqlite
    .prepare(
      `SELECT * FROM "automation_run"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Record<string, unknown>[];
  return rows.map(rowToRun);
}

export function updateRun(
  id: string,
  input: Partial<{
    status: RunStatus;
    context: Record<string, unknown>;
    currentNodeId: string | null;
    attempt: number;
    errorMessage: string | null;
    startedAt: string | null;
    finishedAt: string | null;
  }>,
): AutomationRun {
  ensureAutomationReady();
  const existing = getRunById(id);
  if (!existing) throw new Error("Run not found.");
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "automation_run" SET
        "status" = ?,
        "contextJson" = ?,
        "currentNodeId" = ?,
        "attempt" = ?,
        "errorMessage" = ?,
        "startedAt" = ?,
        "finishedAt" = ?,
        "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(
      input.status ?? existing.status,
      JSON.stringify(input.context ?? existing.context),
      input.currentNodeId === undefined
        ? existing.currentNodeId
        : input.currentNodeId,
      input.attempt ?? existing.attempt,
      input.errorMessage === undefined
        ? existing.errorMessage
        : input.errorMessage,
      input.startedAt === undefined ? existing.startedAt : input.startedAt,
      input.finishedAt === undefined ? existing.finishedAt : input.finishedAt,
      timestamp,
      id,
    );
  return getRunById(id)!;
}

export function createRunStep(input: {
  runId: string;
  workspaceId: string;
  workflowId: string;
  nodeId: string;
  nodeType: string;
  nodeKind: AutomationRunStep["nodeKind"];
  input?: Record<string, unknown>;
}): AutomationRunStep {
  ensureAutomationReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "automation_run_step" (
        "id", "runId", "workspaceId", "workflowId", "nodeId", "nodeType",
        "nodeKind", "status", "attempt", "inputJson", "outputJson",
        "errorMessage", "startedAt", "finishedAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, '{}', NULL, NULL, NULL, ?, ?)`,
    )
    .run(
      id,
      input.runId,
      input.workspaceId,
      input.workflowId,
      input.nodeId,
      input.nodeType,
      input.nodeKind,
      JSON.stringify(input.input ?? {}),
      timestamp,
      timestamp,
    );
  return getRunStepById(id)!;
}

export function getRunStepById(id: string): AutomationRunStep | null {
  ensureAutomationReady();
  const row = sqlite
    .prepare(`SELECT * FROM "automation_run_step" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToRunStep(row) : null;
}

export function listRunSteps(runId: string): AutomationRunStep[] {
  ensureAutomationReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "automation_run_step"
       WHERE "runId" = ?
       ORDER BY "createdAt" ASC`,
    )
    .all(runId) as Record<string, unknown>[];
  return rows.map(rowToRunStep);
}

export function updateRunStep(
  id: string,
  input: Partial<{
    status: RunStepStatus;
    attempt: number;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    errorMessage: string | null;
    startedAt: string | null;
    finishedAt: string | null;
  }>,
): AutomationRunStep {
  ensureAutomationReady();
  const existing = getRunStepById(id);
  if (!existing) throw new Error("Run step not found.");
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "automation_run_step" SET
        "status" = ?,
        "attempt" = ?,
        "inputJson" = ?,
        "outputJson" = ?,
        "errorMessage" = ?,
        "startedAt" = ?,
        "finishedAt" = ?,
        "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(
      input.status ?? existing.status,
      input.attempt ?? existing.attempt,
      JSON.stringify(input.input ?? existing.input),
      JSON.stringify(input.output ?? existing.output),
      input.errorMessage === undefined
        ? existing.errorMessage
        : input.errorMessage,
      input.startedAt === undefined ? existing.startedAt : input.startedAt,
      input.finishedAt === undefined ? existing.finishedAt : input.finishedAt,
      timestamp,
      id,
    );
  return getRunStepById(id)!;
}

export function appendRunLog(input: {
  runId: string;
  workspaceId: string;
  workflowId: string;
  runStepId?: string | null;
  level?: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}): AutomationRunLog {
  ensureAutomationReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "automation_run_log" (
        "id", "runId", "workspaceId", "workflowId", "runStepId",
        "level", "message", "dataJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.runId,
      input.workspaceId,
      input.workflowId,
      input.runStepId ?? null,
      input.level ?? "info",
      input.message,
      JSON.stringify(input.data ?? {}),
      timestamp,
    );
  const row = sqlite
    .prepare(`SELECT * FROM "automation_run_log" WHERE "id" = ?`)
    .get(id) as Record<string, unknown>;
  return rowToLog(row);
}

export function listRunLogs(runId: string): AutomationRunLog[] {
  ensureAutomationReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "automation_run_log"
       WHERE "runId" = ?
       ORDER BY "createdAt" ASC`,
    )
    .all(runId) as Record<string, unknown>[];
  return rows.map(rowToLog);
}

export function enqueueJob(input: {
  workspaceId: string;
  workflowId: string;
  runId: string;
  jobType?: string;
  availableAt?: string;
  priority?: number;
  maxAttempts?: number;
  payload?: Record<string, unknown>;
}): AutomationQueueJob {
  ensureAutomationReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "automation_queue_job" (
        "id", "workspaceId", "workflowId", "runId", "jobType", "status",
        "priority", "attempt", "maxAttempts", "availableAt",
        "lockedAt", "lockedBy", "payloadJson", "lastError",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, 0, ?, ?, NULL, NULL, ?, NULL, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.workflowId,
      input.runId,
      input.jobType ?? "execute_run",
      input.priority ?? 100,
      input.maxAttempts ?? 3,
      input.availableAt ?? timestamp,
      JSON.stringify(input.payload ?? {}),
      timestamp,
      timestamp,
    );
  return getQueueJobById(id)!;
}

export function getQueueJobById(id: string): AutomationQueueJob | null {
  ensureAutomationReady();
  const row = sqlite
    .prepare(`SELECT * FROM "automation_queue_job" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToJob(row) : null;
}

/** Reclaim jobs stuck in `processing` after a worker crash (default 15m). */
export function reclaimStaleQueueJobs(
  staleAfterMs = 15 * 60 * 1000,
): number {
  ensureAutomationReady();
  const cutoff = new Date(Date.now() - staleAfterMs).toISOString();
  const timestamp = nowIso();
  const result = sqlite
    .prepare(
      `UPDATE "automation_queue_job"
       SET "status" = 'pending', "lockedAt" = NULL, "lockedBy" = NULL,
           "updatedAt" = ?, "lastError" = COALESCE("lastError", 'Reclaimed stale lock.')
       WHERE "status" = 'processing'
         AND "lockedAt" IS NOT NULL
         AND "lockedAt" < ?`,
    )
    .run(timestamp, cutoff);
  return result.changes;
}

export function claimQueueJobs(
  limit = 10,
  workerId = `worker_${process.pid}`,
  options: { workspaceId?: string } = {},
): AutomationQueueJob[] {
  ensureAutomationReady();
  reclaimStaleQueueJobs();
  const now = nowIso();
  const clauses = [`"status" = 'pending'`, `"availableAt" <= ?`];
  const params: unknown[] = [now];
  if (options.workspaceId) {
    clauses.push(`"workspaceId" = ?`);
    params.push(options.workspaceId);
  }
  params.push(limit);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "automation_queue_job"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "priority" ASC, "availableAt" ASC
       LIMIT ?`,
    )
    .all(...params) as Record<string, unknown>[];

  const claimed: AutomationQueueJob[] = [];
  for (const row of rows) {
    const result = sqlite
      .prepare(
        `UPDATE "automation_queue_job"
         SET "status" = 'processing', "lockedAt" = ?, "lockedBy" = ?,
             "attempt" = "attempt" + 1, "updatedAt" = ?
         WHERE "id" = ? AND "status" = 'pending'`,
      )
      .run(now, workerId, now, String(row.id));
    if (result.changes > 0) {
      const job = getQueueJobById(String(row.id));
      if (job) claimed.push(job);
    }
  }
  return claimed;
}

export function completeQueueJob(id: string): void {
  ensureAutomationReady();
  sqlite
    .prepare(
      `UPDATE "automation_queue_job"
       SET "status" = 'completed', "updatedAt" = ?,
           "lockedAt" = NULL, "lockedBy" = NULL
       WHERE "id" = ?`,
    )
    .run(nowIso(), id);
}

export function failQueueJob(
  id: string,
  error: string,
  options: { retryDelayMs?: number } = {},
): void {
  ensureAutomationReady();
  const job = getQueueJobById(id);
  if (!job) return;
  const timestamp = nowIso();

  if (job.attempt < job.maxAttempts) {
    const delay = options.retryDelayMs ?? Math.min(60_000, 2 ** job.attempt * 1000);
    const availableAt = new Date(Date.now() + delay).toISOString();
    sqlite
      .prepare(
        `UPDATE "automation_queue_job"
         SET "status" = 'pending', "availableAt" = ?, "lastError" = ?,
             "lockedAt" = NULL, "lockedBy" = NULL, "updatedAt" = ?
         WHERE "id" = ?`,
      )
      .run(availableAt, error, timestamp, id);
    return;
  }

  sqlite
    .prepare(
      `UPDATE "automation_queue_job"
       SET "status" = 'failed', "lastError" = ?, "updatedAt" = ?,
           "lockedAt" = NULL, "lockedBy" = NULL
       WHERE "id" = ?`,
    )
    .run(error, timestamp, id);
}

export function rescheduleRun(
  runId: string,
  availableAt: string,
  payload: Record<string, unknown> = {},
): void {
  ensureAutomationReady();
  const run = getRunById(runId);
  if (!run) throw new Error("Run not found.");
  enqueueJob({
    workspaceId: run.workspaceId,
    workflowId: run.workflowId,
    runId,
    availableAt,
    payload,
  });
}
