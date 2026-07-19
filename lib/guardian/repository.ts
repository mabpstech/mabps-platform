import { randomUUID } from "node:crypto";
import {
  DEFAULT_RETENTION_SCANS,
  DEFAULT_SCAN_INTERVAL_SEC,
} from "@/lib/guardian/defaults";
import { migrateGuardianSchema } from "@/lib/guardian/migrate";
import type {
  GuardianCheckCategory,
  GuardianCheckResult,
  GuardianCheckResultStatus,
  GuardianFinding,
  GuardianFindingStatus,
  GuardianHealthStatus,
  GuardianListFilters,
  GuardianLogStatus,
  GuardianMonitorEvent,
  GuardianMonitorEventType,
  GuardianOpLog,
  GuardianOverviewStats,
  GuardianRepair,
  GuardianRepairAction,
  GuardianRepairStatus,
  GuardianScan,
  GuardianScanStatus,
  GuardianScanTrigger,
  GuardianSettings,
  GuardianSeverity,
} from "@/lib/guardian/types";
import {
  GUARDIAN_CHECK_CATEGORIES,
  GUARDIAN_CHECK_RESULT_STATUSES,
  GUARDIAN_FINDING_STATUSES,
  GUARDIAN_HEALTH_STATUSES,
  GUARDIAN_LOG_STATUSES,
  GUARDIAN_MONITOR_EVENT_TYPES,
  GUARDIAN_REPAIR_ACTIONS,
  GUARDIAN_REPAIR_STATUSES,
  GUARDIAN_SCAN_STATUSES,
  GUARDIAN_SCAN_TRIGGERS,
  GUARDIAN_SEVERITIES,
} from "@/lib/guardian/types";
import { sqlite } from "@/lib/db";

function nowIso(): string {
  return new Date().toISOString();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function likePattern(q: string): string {
  return `%${q.replace(/[%_]/g, (ch) => `\\${ch}`)}%`;
}

function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function parseSeverity(value: unknown): GuardianSeverity {
  const severity = String(value || "info");
  return GUARDIAN_SEVERITIES.includes(severity as GuardianSeverity)
    ? (severity as GuardianSeverity)
    : "info";
}

function parseHealth(value: unknown): GuardianHealthStatus {
  const status = String(value || "unknown");
  return GUARDIAN_HEALTH_STATUSES.includes(status as GuardianHealthStatus)
    ? (status as GuardianHealthStatus)
    : "unknown";
}

function parseScanStatus(value: unknown): GuardianScanStatus {
  const status = String(value || "queued");
  return GUARDIAN_SCAN_STATUSES.includes(status as GuardianScanStatus)
    ? (status as GuardianScanStatus)
    : "queued";
}

function parseTrigger(value: unknown): GuardianScanTrigger {
  const trigger = String(value || "manual");
  return GUARDIAN_SCAN_TRIGGERS.includes(trigger as GuardianScanTrigger)
    ? (trigger as GuardianScanTrigger)
    : "manual";
}

function parseCategory(value: unknown): GuardianCheckCategory {
  const category = String(value || "system");
  return GUARDIAN_CHECK_CATEGORIES.includes(category as GuardianCheckCategory)
    ? (category as GuardianCheckCategory)
    : "system";
}

function parseFindingStatus(value: unknown): GuardianFindingStatus {
  const status = String(value || "open");
  return GUARDIAN_FINDING_STATUSES.includes(status as GuardianFindingStatus)
    ? (status as GuardianFindingStatus)
    : "open";
}

function parseRepairStatus(value: unknown): GuardianRepairStatus {
  const status = String(value || "suggested");
  return GUARDIAN_REPAIR_STATUSES.includes(status as GuardianRepairStatus)
    ? (status as GuardianRepairStatus)
    : "suggested";
}

function parseRepairAction(value: unknown): GuardianRepairAction {
  const action = String(value || "custom");
  return GUARDIAN_REPAIR_ACTIONS.includes(action as GuardianRepairAction)
    ? (action as GuardianRepairAction)
    : "custom";
}

function parseCheckStatus(value: unknown): GuardianCheckResultStatus {
  const status = String(value || "pass");
  return GUARDIAN_CHECK_RESULT_STATUSES.includes(
    status as GuardianCheckResultStatus,
  )
    ? (status as GuardianCheckResultStatus)
    : "pass";
}

function parseMonitorType(value: unknown): GuardianMonitorEventType {
  const type = String(value || "monitor_tick");
  return GUARDIAN_MONITOR_EVENT_TYPES.includes(type as GuardianMonitorEventType)
    ? (type as GuardianMonitorEventType)
    : "monitor_tick";
}

function parseLogStatus(value: unknown): GuardianLogStatus {
  const status = String(value || "success");
  return GUARDIAN_LOG_STATUSES.includes(status as GuardianLogStatus)
    ? (status as GuardianLogStatus)
    : "success";
}

export function ensureGuardianReady(): void {
  migrateGuardianSchema();
}

function rowToSettings(row: Record<string, unknown>): GuardianSettings {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    monitoringEnabled: Boolean(row.monitoringEnabled),
    autoScanEnabled: Boolean(row.autoScanEnabled),
    autoRepairSuggestionsEnabled: Boolean(row.autoRepairSuggestionsEnabled),
    aiTroubleshootingEnabled: Boolean(row.aiTroubleshootingEnabled),
    securityChecksEnabled: Boolean(row.securityChecksEnabled),
    performanceChecksEnabled: Boolean(row.performanceChecksEnabled),
    logAnalysisEnabled: Boolean(row.logAnalysisEnabled),
    scanIntervalSec: Number(row.scanIntervalSec) || DEFAULT_SCAN_INTERVAL_SEC,
    retentionScans: Number(row.retentionScans) || DEFAULT_RETENTION_SCANS,
    alertWebhookUrl: row.alertWebhookUrl
      ? String(row.alertWebhookUrl)
      : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export type GuardianSettingsPublic = GuardianSettings;

export function toPublicSettings(
  settings: GuardianSettings,
): GuardianSettingsPublic {
  return { ...settings };
}

function rowToScan(row: Record<string, unknown>): GuardianScan {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    status: parseScanStatus(row.status),
    trigger: parseTrigger(row.trigger),
    healthStatus: parseHealth(row.healthStatus),
    categories: parseJson<GuardianCheckCategory[]>(row.categoriesJson, []),
    summary: row.summary ? String(row.summary) : null,
    findingsCount: Number(row.findingsCount) || 0,
    criticalCount: Number(row.criticalCount) || 0,
    highCount: Number(row.highCount) || 0,
    mediumCount: Number(row.mediumCount) || 0,
    lowCount: Number(row.lowCount) || 0,
    durationMs:
      row.durationMs == null ? null : Number(row.durationMs) || 0,
    startedAt: row.startedAt ? String(row.startedAt) : null,
    finishedAt: row.finishedAt ? String(row.finishedAt) : null,
    errorMessage: row.errorMessage ? String(row.errorMessage) : null,
    metadata: parseJson(row.metadataJson, {}),
    createdByUserId: row.createdByUserId
      ? String(row.createdByUserId)
      : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToFinding(row: Record<string, unknown>): GuardianFinding {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    scanId: row.scanId ? String(row.scanId) : null,
    category: parseCategory(row.category),
    code: String(row.code),
    title: String(row.title),
    description: String(row.description),
    severity: parseSeverity(row.severity),
    status: parseFindingStatus(row.status),
    evidence: parseJson(row.evidenceJson, {}),
    suggestion: row.suggestion ? String(row.suggestion) : null,
    autoRepairable: Boolean(row.autoRepairable),
    resolvedAt: row.resolvedAt ? String(row.resolvedAt) : null,
    resolvedByUserId: row.resolvedByUserId
      ? String(row.resolvedByUserId)
      : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToRepair(row: Record<string, unknown>): GuardianRepair {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    findingId: row.findingId ? String(row.findingId) : null,
    scanId: row.scanId ? String(row.scanId) : null,
    action: parseRepairAction(row.action),
    title: String(row.title),
    description: String(row.description),
    status: parseRepairStatus(row.status),
    oneClick: Boolean(row.oneClick),
    riskLevel: parseSeverity(row.riskLevel),
    steps: parseJson<string[]>(row.stepsJson, []),
    resultSummary: row.resultSummary ? String(row.resultSummary) : null,
    errorMessage: row.errorMessage ? String(row.errorMessage) : null,
    appliedAt: row.appliedAt ? String(row.appliedAt) : null,
    appliedByUserId: row.appliedByUserId
      ? String(row.appliedByUserId)
      : null,
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToCheckResult(row: Record<string, unknown>): GuardianCheckResult {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    scanId: String(row.scanId),
    category: parseCategory(row.category),
    checkKey: String(row.checkKey),
    title: String(row.title),
    status: parseCheckStatus(row.status),
    severity: parseSeverity(row.severity),
    message: String(row.message),
    latencyMs: row.latencyMs == null ? null : Number(row.latencyMs) || 0,
    details: parseJson(row.detailsJson, {}),
    createdAt: String(row.createdAt),
  };
}

function rowToMonitorEvent(row: Record<string, unknown>): GuardianMonitorEvent {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    scanId: row.scanId ? String(row.scanId) : null,
    findingId: row.findingId ? String(row.findingId) : null,
    repairId: row.repairId ? String(row.repairId) : null,
    type: parseMonitorType(row.type),
    severity: parseSeverity(row.severity),
    title: String(row.title),
    message: row.message ? String(row.message) : null,
    metadata: parseJson(row.metadataJson, {}),
    occurredAt: String(row.occurredAt),
    createdAt: String(row.createdAt),
  };
}

function rowToOpLog(row: Record<string, unknown>): GuardianOpLog {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    scanId: row.scanId ? String(row.scanId) : null,
    findingId: row.findingId ? String(row.findingId) : null,
    repairId: row.repairId ? String(row.repairId) : null,
    operation: String(row.operation),
    status: parseLogStatus(row.status),
    requestSummary: row.requestSummary ? String(row.requestSummary) : null,
    responseSummary: row.responseSummary ? String(row.responseSummary) : null,
    errorMessage: row.errorMessage ? String(row.errorMessage) : null,
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
  };
}

export function ensureWorkspaceGuardian(
  workspaceId: string,
): GuardianSettings {
  ensureGuardianReady();
  const existing = sqlite
    .prepare(`SELECT * FROM "guardian_settings" WHERE "workspaceId" = ?`)
    .get(workspaceId) as Record<string, unknown> | undefined;
  if (existing) return rowToSettings(existing);

  const id = randomUUID();
  const now = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "guardian_settings" (
        "id", "workspaceId", "monitoringEnabled", "autoScanEnabled",
        "autoRepairSuggestionsEnabled", "aiTroubleshootingEnabled",
        "securityChecksEnabled", "performanceChecksEnabled",
        "logAnalysisEnabled", "scanIntervalSec", "retentionScans",
        "alertWebhookUrl", "createdAt", "updatedAt"
      ) VALUES (?, ?, 1, 1, 1, 1, 1, 1, 1, ?, ?, NULL, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      DEFAULT_SCAN_INTERVAL_SEC,
      DEFAULT_RETENTION_SCANS,
      now,
      now,
    );

  return getGuardianSettings(workspaceId)!;
}

export function getGuardianSettings(
  workspaceId: string,
): GuardianSettings | null {
  ensureGuardianReady();
  const row = sqlite
    .prepare(`SELECT * FROM "guardian_settings" WHERE "workspaceId" = ?`)
    .get(workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToSettings(row) : null;
}

export function updateGuardianSettings(
  workspaceId: string,
  input: Partial<{
    monitoringEnabled: boolean;
    autoScanEnabled: boolean;
    autoRepairSuggestionsEnabled: boolean;
    aiTroubleshootingEnabled: boolean;
    securityChecksEnabled: boolean;
    performanceChecksEnabled: boolean;
    logAnalysisEnabled: boolean;
    scanIntervalSec: number;
    retentionScans: number;
    alertWebhookUrl: string | null;
  }>,
): GuardianSettings {
  const current = ensureWorkspaceGuardian(workspaceId);
  const now = nowIso();
  const next = {
    monitoringEnabled:
      typeof input.monitoringEnabled === "boolean"
        ? input.monitoringEnabled
        : current.monitoringEnabled,
    autoScanEnabled:
      typeof input.autoScanEnabled === "boolean"
        ? input.autoScanEnabled
        : current.autoScanEnabled,
    autoRepairSuggestionsEnabled:
      typeof input.autoRepairSuggestionsEnabled === "boolean"
        ? input.autoRepairSuggestionsEnabled
        : current.autoRepairSuggestionsEnabled,
    aiTroubleshootingEnabled:
      typeof input.aiTroubleshootingEnabled === "boolean"
        ? input.aiTroubleshootingEnabled
        : current.aiTroubleshootingEnabled,
    securityChecksEnabled:
      typeof input.securityChecksEnabled === "boolean"
        ? input.securityChecksEnabled
        : current.securityChecksEnabled,
    performanceChecksEnabled:
      typeof input.performanceChecksEnabled === "boolean"
        ? input.performanceChecksEnabled
        : current.performanceChecksEnabled,
    logAnalysisEnabled:
      typeof input.logAnalysisEnabled === "boolean"
        ? input.logAnalysisEnabled
        : current.logAnalysisEnabled,
    scanIntervalSec:
      typeof input.scanIntervalSec === "number" &&
      Number.isFinite(input.scanIntervalSec)
        ? Math.min(Math.max(60, Math.floor(input.scanIntervalSec)), 86_400)
        : current.scanIntervalSec,
    retentionScans:
      typeof input.retentionScans === "number" &&
      Number.isFinite(input.retentionScans)
        ? Math.min(Math.max(5, Math.floor(input.retentionScans)), 500)
        : current.retentionScans,
    alertWebhookUrl:
      input.alertWebhookUrl !== undefined
        ? input.alertWebhookUrl
        : current.alertWebhookUrl,
  };

  sqlite
    .prepare(
      `UPDATE "guardian_settings" SET
        "monitoringEnabled" = ?,
        "autoScanEnabled" = ?,
        "autoRepairSuggestionsEnabled" = ?,
        "aiTroubleshootingEnabled" = ?,
        "securityChecksEnabled" = ?,
        "performanceChecksEnabled" = ?,
        "logAnalysisEnabled" = ?,
        "scanIntervalSec" = ?,
        "retentionScans" = ?,
        "alertWebhookUrl" = ?,
        "updatedAt" = ?
       WHERE "workspaceId" = ?`,
    )
    .run(
      next.monitoringEnabled ? 1 : 0,
      next.autoScanEnabled ? 1 : 0,
      next.autoRepairSuggestionsEnabled ? 1 : 0,
      next.aiTroubleshootingEnabled ? 1 : 0,
      next.securityChecksEnabled ? 1 : 0,
      next.performanceChecksEnabled ? 1 : 0,
      next.logAnalysisEnabled ? 1 : 0,
      next.scanIntervalSec,
      next.retentionScans,
      next.alertWebhookUrl,
      now,
      workspaceId,
    );

  createMonitorEvent(workspaceId, {
    type: "settings_updated",
    severity: "info",
    title: "Guardian settings updated",
    message: "Workspace Guardian configuration was changed.",
  });

  return getGuardianSettings(workspaceId)!;
}

export function createScan(
  workspaceId: string,
  input: {
    trigger?: GuardianScanTrigger;
    categories?: GuardianCheckCategory[];
    createdByUserId?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
): GuardianScan {
  ensureWorkspaceGuardian(workspaceId);
  const id = randomUUID();
  const now = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "guardian_scan" (
        "id", "workspaceId", "status", "trigger", "healthStatus",
        "categoriesJson", "summary", "findingsCount", "criticalCount",
        "highCount", "mediumCount", "lowCount", "durationMs",
        "startedAt", "finishedAt", "errorMessage", "metadataJson",
        "createdByUserId", "createdAt", "updatedAt"
      ) VALUES (?, ?, 'queued', ?, 'unknown', ?, NULL, 0, 0, 0, 0, 0, NULL,
        NULL, NULL, NULL, ?, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.trigger || "manual",
      JSON.stringify(input.categories || []),
      JSON.stringify(input.metadata || {}),
      input.createdByUserId || null,
      now,
      now,
    );
  return getScanById(workspaceId, id)!;
}

export function updateScan(
  workspaceId: string,
  scanId: string,
  input: Partial<{
    status: GuardianScanStatus;
    healthStatus: GuardianHealthStatus;
    categories: GuardianCheckCategory[];
    summary: string | null;
    findingsCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    durationMs: number | null;
    startedAt: string | null;
    finishedAt: string | null;
    errorMessage: string | null;
    metadata: Record<string, unknown>;
  }>,
): GuardianScan {
  const current = getScanById(workspaceId, scanId);
  if (!current) throw new Error("Scan not found.");
  const now = nowIso();
  const next = {
    status: input.status ?? current.status,
    healthStatus: input.healthStatus ?? current.healthStatus,
    categories: input.categories ?? current.categories,
    summary: input.summary !== undefined ? input.summary : current.summary,
    findingsCount: input.findingsCount ?? current.findingsCount,
    criticalCount: input.criticalCount ?? current.criticalCount,
    highCount: input.highCount ?? current.highCount,
    mediumCount: input.mediumCount ?? current.mediumCount,
    lowCount: input.lowCount ?? current.lowCount,
    durationMs:
      input.durationMs !== undefined ? input.durationMs : current.durationMs,
    startedAt:
      input.startedAt !== undefined ? input.startedAt : current.startedAt,
    finishedAt:
      input.finishedAt !== undefined ? input.finishedAt : current.finishedAt,
    errorMessage:
      input.errorMessage !== undefined
        ? input.errorMessage
        : current.errorMessage,
    metadata: input.metadata ?? current.metadata,
  };

  sqlite
    .prepare(
      `UPDATE "guardian_scan" SET
        "status" = ?, "healthStatus" = ?, "categoriesJson" = ?,
        "summary" = ?, "findingsCount" = ?, "criticalCount" = ?,
        "highCount" = ?, "mediumCount" = ?, "lowCount" = ?,
        "durationMs" = ?, "startedAt" = ?, "finishedAt" = ?,
        "errorMessage" = ?, "metadataJson" = ?, "updatedAt" = ?
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      next.status,
      next.healthStatus,
      JSON.stringify(next.categories),
      next.summary,
      next.findingsCount,
      next.criticalCount,
      next.highCount,
      next.mediumCount,
      next.lowCount,
      next.durationMs,
      next.startedAt,
      next.finishedAt,
      next.errorMessage,
      JSON.stringify(next.metadata),
      now,
      scanId,
      workspaceId,
    );

  return getScanById(workspaceId, scanId)!;
}

export function getScanById(
  workspaceId: string,
  scanId: string,
): GuardianScan | null {
  ensureGuardianReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "guardian_scan" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(scanId, workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToScan(row) : null;
}

export function listScans(
  workspaceId: string,
  filters: GuardianListFilters = {},
): GuardianScan[] {
  ensureGuardianReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.q) {
    clauses.push(`("summary" LIKE ? ESCAPE '\\' OR "id" LIKE ? ESCAPE '\\')`);
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "guardian_scan"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];

  return rows.map(rowToScan);
}

export function createFinding(
  workspaceId: string,
  input: {
    scanId?: string | null;
    category: GuardianCheckCategory;
    code: string;
    title: string;
    description: string;
    severity: GuardianSeverity;
    evidence?: Record<string, unknown>;
    suggestion?: string | null;
    autoRepairable?: boolean;
    status?: GuardianFindingStatus;
  },
): GuardianFinding {
  ensureWorkspaceGuardian(workspaceId);
  const id = randomUUID();
  const now = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "guardian_finding" (
        "id", "workspaceId", "scanId", "category", "code", "title",
        "description", "severity", "status", "evidenceJson", "suggestion",
        "autoRepairable", "resolvedAt", "resolvedByUserId",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.scanId || null,
      input.category,
      input.code,
      input.title,
      input.description,
      input.severity,
      input.status || "open",
      JSON.stringify(input.evidence || {}),
      input.suggestion || null,
      input.autoRepairable ? 1 : 0,
      now,
      now,
    );

  createMonitorEvent(workspaceId, {
    type: "finding_opened",
    severity: input.severity,
    title: input.title,
    message: input.description,
    scanId: input.scanId || null,
    findingId: id,
  });

  return getFindingById(workspaceId, id)!;
}

export function updateFinding(
  workspaceId: string,
  findingId: string,
  input: Partial<{
    status: GuardianFindingStatus;
    suggestion: string | null;
    resolvedAt: string | null;
    resolvedByUserId: string | null;
  }>,
): GuardianFinding {
  const current = getFindingById(workspaceId, findingId);
  if (!current) throw new Error("Finding not found.");
  const now = nowIso();
  const next = {
    status: input.status ?? current.status,
    suggestion:
      input.suggestion !== undefined ? input.suggestion : current.suggestion,
    resolvedAt:
      input.resolvedAt !== undefined ? input.resolvedAt : current.resolvedAt,
    resolvedByUserId:
      input.resolvedByUserId !== undefined
        ? input.resolvedByUserId
        : current.resolvedByUserId,
  };

  sqlite
    .prepare(
      `UPDATE "guardian_finding" SET
        "status" = ?, "suggestion" = ?, "resolvedAt" = ?,
        "resolvedByUserId" = ?, "updatedAt" = ?
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      next.status,
      next.suggestion,
      next.resolvedAt,
      next.resolvedByUserId,
      now,
      findingId,
      workspaceId,
    );

  if (next.status === "resolved" && current.status !== "resolved") {
    createMonitorEvent(workspaceId, {
      type: "finding_resolved",
      severity: "info",
      title: `Resolved: ${current.title}`,
      findingId,
      scanId: current.scanId,
    });
  }

  return getFindingById(workspaceId, findingId)!;
}

export function getFindingById(
  workspaceId: string,
  findingId: string,
): GuardianFinding | null {
  ensureGuardianReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "guardian_finding" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(findingId, workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToFinding(row) : null;
}

export function listFindings(
  workspaceId: string,
  filters: GuardianListFilters = {},
): GuardianFinding[] {
  ensureGuardianReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.category) {
    clauses.push(`"category" = ?`);
    params.push(filters.category);
  }
  if (filters.severity) {
    clauses.push(`"severity" = ?`);
    params.push(filters.severity);
  }
  if (filters.scanId) {
    clauses.push(`"scanId" = ?`);
    params.push(filters.scanId);
  }
  if (filters.q) {
    clauses.push(
      `("title" LIKE ? ESCAPE '\\' OR "description" LIKE ? ESCAPE '\\' OR "code" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "guardian_finding"
       WHERE ${clauses.join(" AND ")}
       ORDER BY
         CASE "severity"
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
           ELSE 5
         END,
         "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];

  return rows.map(rowToFinding);
}

export function createRepair(
  workspaceId: string,
  input: {
    findingId?: string | null;
    scanId?: string | null;
    action: GuardianRepairAction;
    title: string;
    description: string;
    status?: GuardianRepairStatus;
    oneClick?: boolean;
    riskLevel?: GuardianSeverity;
    steps?: string[];
    metadata?: Record<string, unknown>;
  },
): GuardianRepair {
  ensureWorkspaceGuardian(workspaceId);
  const id = randomUUID();
  const now = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "guardian_repair" (
        "id", "workspaceId", "findingId", "scanId", "action", "title",
        "description", "status", "oneClick", "riskLevel", "stepsJson",
        "resultSummary", "errorMessage", "appliedAt", "appliedByUserId",
        "metadataJson", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.findingId || null,
      input.scanId || null,
      input.action,
      input.title,
      input.description,
      input.status || (input.oneClick ? "suggested" : "manual"),
      input.oneClick ? 1 : 0,
      input.riskLevel || "low",
      JSON.stringify(input.steps || []),
      JSON.stringify(input.metadata || {}),
      now,
      now,
    );
  return getRepairById(workspaceId, id)!;
}

export function updateRepair(
  workspaceId: string,
  repairId: string,
  input: Partial<{
    status: GuardianRepairStatus;
    resultSummary: string | null;
    errorMessage: string | null;
    appliedAt: string | null;
    appliedByUserId: string | null;
    metadata: Record<string, unknown>;
  }>,
): GuardianRepair {
  const current = getRepairById(workspaceId, repairId);
  if (!current) throw new Error("Repair not found.");
  const now = nowIso();
  const next = {
    status: input.status ?? current.status,
    resultSummary:
      input.resultSummary !== undefined
        ? input.resultSummary
        : current.resultSummary,
    errorMessage:
      input.errorMessage !== undefined
        ? input.errorMessage
        : current.errorMessage,
    appliedAt:
      input.appliedAt !== undefined ? input.appliedAt : current.appliedAt,
    appliedByUserId:
      input.appliedByUserId !== undefined
        ? input.appliedByUserId
        : current.appliedByUserId,
    metadata: input.metadata ?? current.metadata,
  };

  sqlite
    .prepare(
      `UPDATE "guardian_repair" SET
        "status" = ?, "resultSummary" = ?, "errorMessage" = ?,
        "appliedAt" = ?, "appliedByUserId" = ?, "metadataJson" = ?,
        "updatedAt" = ?
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      next.status,
      next.resultSummary,
      next.errorMessage,
      next.appliedAt,
      next.appliedByUserId,
      JSON.stringify(next.metadata),
      now,
      repairId,
      workspaceId,
    );

  return getRepairById(workspaceId, repairId)!;
}

export function getRepairById(
  workspaceId: string,
  repairId: string,
): GuardianRepair | null {
  ensureGuardianReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "guardian_repair" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(repairId, workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToRepair(row) : null;
}

export function listRepairs(
  workspaceId: string,
  filters: GuardianListFilters = {},
): GuardianRepair[] {
  ensureGuardianReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.findingId) {
    clauses.push(`"findingId" = ?`);
    params.push(filters.findingId);
  }
  if (filters.scanId) {
    clauses.push(`"scanId" = ?`);
    params.push(filters.scanId);
  }
  if (filters.q) {
    clauses.push(
      `("title" LIKE ? ESCAPE '\\' OR "description" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "guardian_repair"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];

  return rows.map(rowToRepair);
}

export function createCheckResult(
  workspaceId: string,
  input: {
    scanId: string;
    category: GuardianCheckCategory;
    checkKey: string;
    title: string;
    status: GuardianCheckResultStatus;
    severity: GuardianSeverity;
    message: string;
    latencyMs?: number | null;
    details?: Record<string, unknown>;
  },
): GuardianCheckResult {
  ensureGuardianReady();
  const id = randomUUID();
  const now = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "guardian_check_result" (
        "id", "workspaceId", "scanId", "category", "checkKey", "title",
        "status", "severity", "message", "latencyMs", "detailsJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.scanId,
      input.category,
      input.checkKey,
      input.title,
      input.status,
      input.severity,
      input.message,
      input.latencyMs ?? null,
      JSON.stringify(input.details || {}),
      now,
    );

  const row = sqlite
    .prepare(
      `SELECT * FROM "guardian_check_result" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(id, workspaceId) as Record<string, unknown>;
  return rowToCheckResult(row);
}

export function listCheckResults(
  workspaceId: string,
  filters: { scanId?: string; limit?: number } = {},
): GuardianCheckResult[] {
  ensureGuardianReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.scanId) {
    clauses.push(`"scanId" = ?`);
    params.push(filters.scanId);
  }
  const limit = filters.limit ?? 200;
  params.push(limit);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "guardian_check_result"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ?`,
    )
    .all(...params) as Record<string, unknown>[];

  return rows.map(rowToCheckResult);
}

export function createMonitorEvent(
  workspaceId: string,
  input: {
    type: GuardianMonitorEventType;
    severity?: GuardianSeverity;
    title: string;
    message?: string | null;
    scanId?: string | null;
    findingId?: string | null;
    repairId?: string | null;
    metadata?: Record<string, unknown>;
    occurredAt?: string;
  },
): GuardianMonitorEvent {
  ensureGuardianReady();
  const id = randomUUID();
  const now = nowIso();
  const occurredAt = input.occurredAt || now;
  sqlite
    .prepare(
      `INSERT INTO "guardian_monitor_event" (
        "id", "workspaceId", "scanId", "findingId", "repairId", "type",
        "severity", "title", "message", "metadataJson", "occurredAt", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.scanId || null,
      input.findingId || null,
      input.repairId || null,
      input.type,
      input.severity || "info",
      input.title,
      input.message || null,
      JSON.stringify(input.metadata || {}),
      occurredAt,
      now,
    );

  const row = sqlite
    .prepare(
      `SELECT * FROM "guardian_monitor_event" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(id, workspaceId) as Record<string, unknown>;
  return rowToMonitorEvent(row);
}

export function listMonitorEvents(
  workspaceId: string,
  filters: GuardianListFilters = {},
): GuardianMonitorEvent[] {
  ensureGuardianReady();
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const rows = sqlite
    .prepare(
      `SELECT * FROM "guardian_monitor_event"
       WHERE "workspaceId" = ?
       ORDER BY "occurredAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(workspaceId, limit, offset) as Record<string, unknown>[];
  return rows.map(rowToMonitorEvent);
}

export function createGuardianLog(
  workspaceId: string,
  input: {
    operation: string;
    status?: GuardianLogStatus;
    requestSummary?: string | null;
    responseSummary?: string | null;
    errorMessage?: string | null;
    scanId?: string | null;
    findingId?: string | null;
    repairId?: string | null;
    metadata?: Record<string, unknown>;
  },
): GuardianOpLog {
  ensureGuardianReady();
  const id = randomUUID();
  const now = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "guardian_op_log" (
        "id", "workspaceId", "scanId", "findingId", "repairId", "operation",
        "status", "requestSummary", "responseSummary", "errorMessage",
        "metadataJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.scanId || null,
      input.findingId || null,
      input.repairId || null,
      input.operation,
      input.status || "success",
      input.requestSummary || null,
      input.responseSummary || null,
      input.errorMessage || null,
      JSON.stringify(input.metadata || {}),
      now,
    );

  const row = sqlite
    .prepare(
      `SELECT * FROM "guardian_op_log" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(id, workspaceId) as Record<string, unknown>;
  return rowToOpLog(row);
}

export function listGuardianLogs(
  workspaceId: string,
  filters: GuardianListFilters = {},
): GuardianOpLog[] {
  ensureGuardianReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "guardian_op_log"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];

  return rows.map(rowToOpLog);
}

export function pruneOldScans(workspaceId: string): number {
  const settings = ensureWorkspaceGuardian(workspaceId);
  const keep = settings.retentionScans;
  const ids = sqlite
    .prepare(
      `SELECT "id" FROM "guardian_scan"
       WHERE "workspaceId" = ?
       ORDER BY "createdAt" DESC
       LIMIT -1 OFFSET ?`,
    )
    .all(workspaceId, keep) as Array<{ id: string }>;

  if (!ids.length) return 0;
  const del = sqlite.prepare(
    `DELETE FROM "guardian_scan" WHERE "id" = ? AND "workspaceId" = ?`,
  );
  const tx = sqlite.transaction(() => {
    for (const row of ids) del.run(row.id, workspaceId);
  });
  tx();
  return ids.length;
}

export function getGuardianOverview(
  workspaceId: string,
): GuardianOverviewStats {
  const settings = ensureWorkspaceGuardian(workspaceId);
  const today = todayStartIso();

  const scans = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "guardian_scan" WHERE "workspaceId" = ?`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  const scansToday = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "guardian_scan"
         WHERE "workspaceId" = ? AND "createdAt" >= ?`,
      )
      .get(workspaceId, today) as { c: number }
  ).c;

  const openFindings = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "guardian_finding"
         WHERE "workspaceId" = ? AND "status" IN ('open', 'acknowledged', 'repairing')`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  const criticalFindings = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "guardian_finding"
         WHERE "workspaceId" = ? AND "status" IN ('open', 'acknowledged', 'repairing')
           AND "severity" = 'critical'`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  const highFindings = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "guardian_finding"
         WHERE "workspaceId" = ? AND "status" IN ('open', 'acknowledged', 'repairing')
           AND "severity" = 'high'`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  const suggestedRepairs = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "guardian_repair"
         WHERE "workspaceId" = ? AND "status" IN ('suggested', 'approved', 'manual')`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  const appliedRepairs = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "guardian_repair"
         WHERE "workspaceId" = ? AND "status" = 'applied'`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  const lastScan = listScans(workspaceId, { limit: 1 })[0] || null;

  const breakdownRows = sqlite
    .prepare(
      `SELECT "category", COUNT(*) as c FROM "guardian_finding"
       WHERE "workspaceId" = ? AND "status" IN ('open', 'acknowledged', 'repairing')
       GROUP BY "category"`,
    )
    .all(workspaceId) as Array<{ category: string; c: number }>;

  const checkBreakdown = Object.fromEntries(
    GUARDIAN_CHECK_CATEGORIES.map((category) => [category, 0]),
  ) as Record<GuardianCheckCategory, number>;

  for (const row of breakdownRows) {
    const category = parseCategory(row.category);
    checkBreakdown[category] = row.c;
  }

  let healthStatus: GuardianHealthStatus = "healthy";
  if (criticalFindings > 0) healthStatus = "unhealthy";
  else if (highFindings > 0 || openFindings > 5) healthStatus = "degraded";
  else if (lastScan?.healthStatus) healthStatus = lastScan.healthStatus;

  return {
    healthStatus,
    scans,
    scansToday,
    openFindings,
    criticalFindings,
    highFindings,
    suggestedRepairs,
    appliedRepairs,
    lastScanAt: lastScan?.finishedAt || lastScan?.createdAt || null,
    lastScanHealth: lastScan?.healthStatus || null,
    monitoringEnabled: settings.monitoringEnabled,
    autoScanEnabled: settings.autoScanEnabled,
    aiTroubleshootingEnabled: settings.aiTroubleshootingEnabled,
    securityChecksEnabled: settings.securityChecksEnabled,
    performanceChecksEnabled: settings.performanceChecksEnabled,
    logAnalysisEnabled: settings.logAnalysisEnabled,
    checkBreakdown,
  };
}
