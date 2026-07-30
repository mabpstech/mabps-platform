import { randomUUID } from "node:crypto";
import {
  DEFAULT_DEPLOYMENT_PROVIDER,
  DEFAULT_FRAMEWORK,
  DEFAULT_HEALTH_CHECK_INTERVAL_SEC,
  DEFAULT_HEALTH_CHECK_PATH,
  DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
  DEFAULT_PRODUCTION_BRANCH,
  DEFAULT_RETENTION_DEPLOYMENTS,
  maskSecret,
  slugify,
} from "@/lib/deployment/defaults";
import { migrateDeploymentSchema } from "@/lib/deployment/migrate";
import type {
  BuildLogLevel,
  DeploymentBuildLog,
  DeploymentDomain,
  DeploymentEnvironment,
  DeploymentEnvVar,
  DeploymentHealthCheck,
  DeploymentListFilters,
  DeploymentLogStatus,
  DeploymentMonitorEvent,
  DeploymentOpLog,
  DeploymentOverviewStats,
  DeploymentProject,
  DeploymentProjectStatus,
  DeploymentProvider,
  DeploymentRecord,
  DeploymentSettings,
  DeploymentStatus,
  DeploymentTrigger,
  DomainDnsProvider,
  DomainStatus,
  EnvTarget,
  HealthStatus,
  MonitorEventType,
  MonitorSeverity,
  SslProvider,
  SslStatus,
} from "@/lib/deployment/types";
import {
  BUILD_LOG_LEVELS,
  DEPLOYMENT_ENVIRONMENTS,
  DEPLOYMENT_LOG_STATUSES,
  DEPLOYMENT_PROJECT_STATUSES,
  DEPLOYMENT_PROVIDERS,
  DEPLOYMENT_STATUSES,
  DEPLOYMENT_TRIGGERS,
  DOMAIN_DNS_PROVIDERS,
  DOMAIN_STATUSES,
  ENV_TARGETS,
  HEALTH_STATUSES,
  MONITOR_EVENT_TYPES,
  MONITOR_SEVERITIES,
  SSL_PROVIDERS,
  SSL_STATUSES,
} from "@/lib/deployment/types";
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

function parseProvider(value: unknown): DeploymentProvider {
  const provider = String(value || DEFAULT_DEPLOYMENT_PROVIDER);
  return DEPLOYMENT_PROVIDERS.includes(provider as DeploymentProvider)
    ? (provider as DeploymentProvider)
    : DEFAULT_DEPLOYMENT_PROVIDER;
}

function parseProjectStatus(value: unknown): DeploymentProjectStatus {
  const status = String(value || "active");
  return DEPLOYMENT_PROJECT_STATUSES.includes(status as DeploymentProjectStatus)
    ? (status as DeploymentProjectStatus)
    : "active";
}

function parseDeploymentStatus(value: unknown): DeploymentStatus {
  const status = String(value || "queued");
  return DEPLOYMENT_STATUSES.includes(status as DeploymentStatus)
    ? (status as DeploymentStatus)
    : "queued";
}

function parseEnvironment(value: unknown): DeploymentEnvironment {
  const env = String(value || "production");
  return DEPLOYMENT_ENVIRONMENTS.includes(env as DeploymentEnvironment)
    ? (env as DeploymentEnvironment)
    : "production";
}

function parseTrigger(value: unknown): DeploymentTrigger {
  const trigger = String(value || "manual");
  return DEPLOYMENT_TRIGGERS.includes(trigger as DeploymentTrigger)
    ? (trigger as DeploymentTrigger)
    : "manual";
}

function parseDomainStatus(value: unknown): DomainStatus {
  const status = String(value || "pending");
  return DOMAIN_STATUSES.includes(status as DomainStatus)
    ? (status as DomainStatus)
    : "pending";
}

function parseDnsProvider(value: unknown): DomainDnsProvider {
  const provider = String(value || "manual");
  return DOMAIN_DNS_PROVIDERS.includes(provider as DomainDnsProvider)
    ? (provider as DomainDnsProvider)
    : "manual";
}

function parseSslStatus(value: unknown): SslStatus {
  const status = String(value || "pending");
  return SSL_STATUSES.includes(status as SslStatus)
    ? (status as SslStatus)
    : "pending";
}

function parseSslProvider(value: unknown): SslProvider {
  const provider = String(value || "auto");
  return SSL_PROVIDERS.includes(provider as SslProvider)
    ? (provider as SslProvider)
    : "auto";
}

function parseEnvTarget(value: unknown): EnvTarget {
  const target = String(value || "production");
  return ENV_TARGETS.includes(target as EnvTarget)
    ? (target as EnvTarget)
    : "production";
}

function parseBuildLevel(value: unknown): BuildLogLevel {
  const level = String(value || "info");
  return BUILD_LOG_LEVELS.includes(level as BuildLogLevel)
    ? (level as BuildLogLevel)
    : "info";
}

function parseHealthStatus(value: unknown): HealthStatus {
  const status = String(value || "unknown");
  return HEALTH_STATUSES.includes(status as HealthStatus)
    ? (status as HealthStatus)
    : "unknown";
}

function parseMonitorType(value: unknown): MonitorEventType {
  const type = String(value || "deployment_started");
  return MONITOR_EVENT_TYPES.includes(type as MonitorEventType)
    ? (type as MonitorEventType)
    : "deployment_started";
}

function parseSeverity(value: unknown): MonitorSeverity {
  const severity = String(value || "info");
  return MONITOR_SEVERITIES.includes(severity as MonitorSeverity)
    ? (severity as MonitorSeverity)
    : "info";
}

function parseLogStatus(value: unknown): DeploymentLogStatus {
  const status = String(value || "success");
  return DEPLOYMENT_LOG_STATUSES.includes(status as DeploymentLogStatus)
    ? (status as DeploymentLogStatus)
    : "success";
}

export function ensureDeploymentReady(): void {
  migrateDeploymentSchema();
}

function rowToSettings(row: Record<string, unknown>): DeploymentSettings {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    defaultProvider: parseProvider(row.defaultProvider),
    autoSslEnabled: Boolean(row.autoSslEnabled),
    autoDnsVerifyEnabled: Boolean(row.autoDnsVerifyEnabled),
    healthChecksEnabled: Boolean(row.healthChecksEnabled),
    monitoringEnabled: Boolean(row.monitoringEnabled),
    publishOnDomainVerify: Boolean(row.publishOnDomainVerify),
    healthCheckIntervalSec: Number(
      row.healthCheckIntervalSec ?? DEFAULT_HEALTH_CHECK_INTERVAL_SEC,
    ),
    healthCheckPath: String(row.healthCheckPath || DEFAULT_HEALTH_CHECK_PATH),
    healthCheckTimeoutMs: Number(
      row.healthCheckTimeoutMs ?? DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
    ),
    retentionDeployments: Number(
      row.retentionDeployments ?? DEFAULT_RETENTION_DEPLOYMENTS,
    ),
    vercelTeamId: (row.vercelTeamId as string | null) ?? null,
    vercelToken: (row.vercelToken as string | null) ?? null,
    cloudflareAccountId: (row.cloudflareAccountId as string | null) ?? null,
    cloudflareApiToken: (row.cloudflareApiToken as string | null) ?? null,
    cloudflareZoneId: (row.cloudflareZoneId as string | null) ?? null,
    webhookUrl: (row.webhookUrl as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export type DeploymentSettingsPublic = Omit<
  DeploymentSettings,
  "vercelToken" | "cloudflareApiToken"
> & {
  vercelTokenMasked: string;
  hasVercelToken: boolean;
  cloudflareApiTokenMasked: string;
  hasCloudflareToken: boolean;
};

export function toPublicSettings(
  settings: DeploymentSettings,
): DeploymentSettingsPublic {
  const { vercelToken, cloudflareApiToken, ...rest } = settings;
  return {
    ...rest,
    vercelTokenMasked: maskSecret(vercelToken),
    hasVercelToken: Boolean(vercelToken),
    cloudflareApiTokenMasked: maskSecret(cloudflareApiToken),
    hasCloudflareToken: Boolean(cloudflareApiToken),
  };
}

function rowToProject(row: Record<string, unknown>): DeploymentProject {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    slug: String(row.slug),
    provider: parseProvider(row.provider),
    status: parseProjectStatus(row.status),
    siteId: (row.siteId as string | null) ?? null,
    productionBranch: String(row.productionBranch || DEFAULT_PRODUCTION_BRANCH),
    framework: String(row.framework || DEFAULT_FRAMEWORK),
    rootDirectory: String(row.rootDirectory || "/"),
    buildCommand: (row.buildCommand as string | null) ?? null,
    outputDirectory: (row.outputDirectory as string | null) ?? null,
    vercelProjectId: (row.vercelProjectId as string | null) ?? null,
    cloudflareProjectName: (row.cloudflareProjectName as string | null) ?? null,
    currentDeploymentId: (row.currentDeploymentId as string | null) ?? null,
    lastPublishedAt: (row.lastPublishedAt as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    createdByUserId: (row.createdByUserId as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToDomain(row: Record<string, unknown>): DeploymentDomain {
  const method = String(row.verificationMethod || "txt");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    projectId: String(row.projectId),
    hostname: String(row.hostname),
    status: parseDomainStatus(row.status),
    isPrimary: Boolean(row.isPrimary),
    verificationMethod: method === "cname" ? "cname" : "txt",
    verificationToken: String(row.verificationToken),
    verifiedAt: (row.verifiedAt as string | null) ?? null,
    dnsProvider: parseDnsProvider(row.dnsProvider),
    cnameTarget: (row.cnameTarget as string | null) ?? null,
    aRecordTarget: (row.aRecordTarget as string | null) ?? null,
    sslStatus: parseSslStatus(row.sslStatus),
    sslProvider: parseSslProvider(row.sslProvider),
    sslIssuedAt: (row.sslIssuedAt as string | null) ?? null,
    sslExpiresAt: (row.sslExpiresAt as string | null) ?? null,
    lastDnsCheckAt: (row.lastDnsCheckAt as string | null) ?? null,
    lastDnsError: (row.lastDnsError as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToEnvVar(row: Record<string, unknown>): DeploymentEnvVar {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    projectId: String(row.projectId),
    key: String(row.key),
    value: String(row.value),
    isSecret: Boolean(row.isSecret),
    target: parseEnvTarget(row.target),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export type DeploymentEnvVarPublic = Omit<DeploymentEnvVar, "value"> & {
  valueMasked: string;
  hasValue: boolean;
};

export function toPublicEnvVar(env: DeploymentEnvVar): DeploymentEnvVarPublic {
  return {
    id: env.id,
    workspaceId: env.workspaceId,
    projectId: env.projectId,
    key: env.key,
    isSecret: env.isSecret,
    target: env.target,
    createdAt: env.createdAt,
    updatedAt: env.updatedAt,
    valueMasked: env.isSecret ? maskSecret(env.value) : env.value,
    hasValue: Boolean(env.value),
  };
}

function rowToDeployment(row: Record<string, unknown>): DeploymentRecord {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    projectId: String(row.projectId),
    status: parseDeploymentStatus(row.status),
    provider: parseProvider(row.provider),
    environment: parseEnvironment(row.environment),
    trigger: parseTrigger(row.trigger),
    commitSha: (row.commitSha as string | null) ?? null,
    commitMessage: (row.commitMessage as string | null) ?? null,
    branch: (row.branch as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    inspectorUrl: (row.inspectorUrl as string | null) ?? null,
    providerDeploymentId: (row.providerDeploymentId as string | null) ?? null,
    previousDeploymentId: (row.previousDeploymentId as string | null) ?? null,
    isRollback: Boolean(row.isRollback),
    rolledBackFromId: (row.rolledBackFromId as string | null) ?? null,
    buildStartedAt: (row.buildStartedAt as string | null) ?? null,
    buildFinishedAt: (row.buildFinishedAt as string | null) ?? null,
    publishedAt: (row.publishedAt as string | null) ?? null,
    failedAt: (row.failedAt as string | null) ?? null,
    errorMessage: (row.errorMessage as string | null) ?? null,
    durationMs:
      typeof row.durationMs === "number"
        ? row.durationMs
        : row.durationMs != null
          ? Number(row.durationMs)
          : null,
    metadata: parseJson(row.metadataJson, {}),
    createdByUserId: (row.createdByUserId as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToBuildLog(row: Record<string, unknown>): DeploymentBuildLog {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    deploymentId: String(row.deploymentId),
    level: parseBuildLevel(row.level),
    message: String(row.message),
    sequence: Number(row.sequence || 0),
    createdAt: String(row.createdAt),
  };
}

function rowToHealthCheck(row: Record<string, unknown>): DeploymentHealthCheck {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    projectId: String(row.projectId),
    domainId: (row.domainId as string | null) ?? null,
    deploymentId: (row.deploymentId as string | null) ?? null,
    url: String(row.url),
    status: parseHealthStatus(row.status),
    httpStatus:
      typeof row.httpStatus === "number"
        ? row.httpStatus
        : row.httpStatus != null
          ? Number(row.httpStatus)
          : null,
    latencyMs:
      typeof row.latencyMs === "number"
        ? row.latencyMs
        : row.latencyMs != null
          ? Number(row.latencyMs)
          : null,
    errorMessage: (row.errorMessage as string | null) ?? null,
    checkedAt: String(row.checkedAt),
    createdAt: String(row.createdAt),
  };
}

function rowToMonitorEvent(
  row: Record<string, unknown>,
): DeploymentMonitorEvent {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    projectId: (row.projectId as string | null) ?? null,
    deploymentId: (row.deploymentId as string | null) ?? null,
    domainId: (row.domainId as string | null) ?? null,
    type: parseMonitorType(row.type),
    severity: parseSeverity(row.severity),
    title: String(row.title),
    message: (row.message as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    occurredAt: String(row.occurredAt),
    createdAt: String(row.createdAt),
  };
}

function rowToOpLog(row: Record<string, unknown>): DeploymentOpLog {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    projectId: (row.projectId as string | null) ?? null,
    deploymentId: (row.deploymentId as string | null) ?? null,
    operation: String(row.operation),
    status: parseLogStatus(row.status),
    requestSummary: (row.requestSummary as string | null) ?? null,
    responseSummary: (row.responseSummary as string | null) ?? null,
    errorMessage: (row.errorMessage as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
  };
}

export function ensureWorkspaceDeployment(
  workspaceId: string,
): DeploymentSettings {
  ensureDeploymentReady();
  const existing = sqlite
    .prepare(`SELECT * FROM "deployment_settings" WHERE "workspaceId" = ?`)
    .get(workspaceId) as Record<string, unknown> | undefined;
  if (existing) return rowToSettings(existing);

  const now = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "deployment_settings" (
        "id", "workspaceId", "defaultProvider", "autoSslEnabled",
        "autoDnsVerifyEnabled", "healthChecksEnabled", "monitoringEnabled",
        "publishOnDomainVerify", "healthCheckIntervalSec", "healthCheckPath",
        "healthCheckTimeoutMs", "retentionDeployments", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, 1, 1, 1, 1, 0, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      DEFAULT_DEPLOYMENT_PROVIDER,
      DEFAULT_HEALTH_CHECK_INTERVAL_SEC,
      DEFAULT_HEALTH_CHECK_PATH,
      DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
      DEFAULT_RETENTION_DEPLOYMENTS,
      now,
      now,
    );

  return getDeploymentSettings(workspaceId)!;
}

export function getDeploymentSettings(
  workspaceId: string,
): DeploymentSettings | null {
  ensureDeploymentReady();
  const row = sqlite
    .prepare(`SELECT * FROM "deployment_settings" WHERE "workspaceId" = ?`)
    .get(workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToSettings(row) : null;
}

export function updateDeploymentSettings(
  workspaceId: string,
  input: Partial<{
    defaultProvider: DeploymentProvider;
    autoSslEnabled: boolean;
    autoDnsVerifyEnabled: boolean;
    healthChecksEnabled: boolean;
    monitoringEnabled: boolean;
    publishOnDomainVerify: boolean;
    healthCheckIntervalSec: number;
    healthCheckPath: string;
    healthCheckTimeoutMs: number;
    retentionDeployments: number;
    vercelTeamId: string | null;
    vercelToken: string | null;
    cloudflareAccountId: string | null;
    cloudflareApiToken: string | null;
    cloudflareZoneId: string | null;
    webhookUrl: string | null;
    clearVercelToken: boolean;
    clearCloudflareToken: boolean;
  }>,
): DeploymentSettings {
  const current = ensureWorkspaceDeployment(workspaceId);
  const now = nowIso();

  let vercelToken = current.vercelToken;
  if (input.clearVercelToken) vercelToken = null;
  else if (input.vercelToken !== undefined) vercelToken = input.vercelToken;

  let cloudflareApiToken = current.cloudflareApiToken;
  if (input.clearCloudflareToken) cloudflareApiToken = null;
  else if (input.cloudflareApiToken !== undefined) {
    cloudflareApiToken = input.cloudflareApiToken;
  }

  sqlite
    .prepare(
      `UPDATE "deployment_settings" SET
        "defaultProvider" = ?,
        "autoSslEnabled" = ?,
        "autoDnsVerifyEnabled" = ?,
        "healthChecksEnabled" = ?,
        "monitoringEnabled" = ?,
        "publishOnDomainVerify" = ?,
        "healthCheckIntervalSec" = ?,
        "healthCheckPath" = ?,
        "healthCheckTimeoutMs" = ?,
        "retentionDeployments" = ?,
        "vercelTeamId" = ?,
        "vercelToken" = ?,
        "cloudflareAccountId" = ?,
        "cloudflareApiToken" = ?,
        "cloudflareZoneId" = ?,
        "webhookUrl" = ?,
        "updatedAt" = ?
      WHERE "workspaceId" = ?`,
    )
    .run(
      input.defaultProvider ?? current.defaultProvider,
      (input.autoSslEnabled ?? current.autoSslEnabled) ? 1 : 0,
      (input.autoDnsVerifyEnabled ?? current.autoDnsVerifyEnabled) ? 1 : 0,
      (input.healthChecksEnabled ?? current.healthChecksEnabled) ? 1 : 0,
      (input.monitoringEnabled ?? current.monitoringEnabled) ? 1 : 0,
      (input.publishOnDomainVerify ?? current.publishOnDomainVerify) ? 1 : 0,
      input.healthCheckIntervalSec ?? current.healthCheckIntervalSec,
      input.healthCheckPath ?? current.healthCheckPath,
      input.healthCheckTimeoutMs ?? current.healthCheckTimeoutMs,
      input.retentionDeployments ?? current.retentionDeployments,
      input.vercelTeamId !== undefined
        ? input.vercelTeamId
        : current.vercelTeamId,
      vercelToken,
      input.cloudflareAccountId !== undefined
        ? input.cloudflareAccountId
        : current.cloudflareAccountId,
      cloudflareApiToken,
      input.cloudflareZoneId !== undefined
        ? input.cloudflareZoneId
        : current.cloudflareZoneId,
      input.webhookUrl !== undefined ? input.webhookUrl : current.webhookUrl,
      now,
      workspaceId,
    );

  return getDeploymentSettings(workspaceId)!;
}

export function listProjects(
  workspaceId: string,
  filters: DeploymentListFilters = {},
): DeploymentProject[] {
  ensureDeploymentReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.provider) {
    clauses.push(`"provider" = ?`);
    params.push(filters.provider);
  }
  if (filters.q) {
    clauses.push(`("name" LIKE ? ESCAPE '\\' OR "slug" LIKE ? ESCAPE '\\')`);
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "deployment_project"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "updatedAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];

  return rows.map(rowToProject);
}

export function getProjectById(
  workspaceId: string,
  projectId: string,
): DeploymentProject | null {
  ensureDeploymentReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "deployment_project" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(projectId, workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToProject(row) : null;
}

export function getProjectBySlug(
  workspaceId: string,
  slug: string,
): DeploymentProject | null {
  ensureDeploymentReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "deployment_project" WHERE "workspaceId" = ? AND "slug" = ?`,
    )
    .get(workspaceId, slug) as Record<string, unknown> | undefined;
  return row ? rowToProject(row) : null;
}

export function createProject(
  workspaceId: string,
  input: {
    name: string;
    slug?: string;
    provider?: DeploymentProvider;
    siteId?: string | null;
    productionBranch?: string;
    framework?: string;
    rootDirectory?: string;
    buildCommand?: string | null;
    outputDirectory?: string | null;
    vercelProjectId?: string | null;
    cloudflareProjectName?: string | null;
    createdByUserId?: string | null;
    metadata?: Record<string, unknown>;
  },
): DeploymentProject {
  ensureWorkspaceDeployment(workspaceId);
  const settings = getDeploymentSettings(workspaceId)!;
  const now = nowIso();
  const id = randomUUID();
  const baseSlug = slugify(input.slug || input.name);
  if (!baseSlug) throw new Error("Project name is required.");

  let slug = baseSlug;
  let attempt = 1;
  while (getProjectBySlug(workspaceId, slug)) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  sqlite
    .prepare(
      `INSERT INTO "deployment_project" (
        "id", "workspaceId", "name", "slug", "provider", "status", "siteId",
        "productionBranch", "framework", "rootDirectory", "buildCommand",
        "outputDirectory", "vercelProjectId", "cloudflareProjectName",
        "metadataJson", "createdByUserId", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.name.trim(),
      slug,
      input.provider ?? settings.defaultProvider,
      input.siteId ?? null,
      input.productionBranch ?? DEFAULT_PRODUCTION_BRANCH,
      input.framework ?? DEFAULT_FRAMEWORK,
      input.rootDirectory ?? "/",
      input.buildCommand ?? null,
      input.outputDirectory ?? null,
      input.vercelProjectId ?? null,
      input.cloudflareProjectName ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.createdByUserId ?? null,
      now,
      now,
    );

  return getProjectById(workspaceId, id)!;
}

export function updateProject(
  workspaceId: string,
  projectId: string,
  input: Partial<{
    name: string;
    provider: DeploymentProvider;
    status: DeploymentProjectStatus;
    siteId: string | null;
    productionBranch: string;
    framework: string;
    rootDirectory: string;
    buildCommand: string | null;
    outputDirectory: string | null;
    vercelProjectId: string | null;
    cloudflareProjectName: string | null;
    currentDeploymentId: string | null;
    lastPublishedAt: string | null;
    metadata: Record<string, unknown>;
  }>,
): DeploymentProject {
  const existing = getProjectById(workspaceId, projectId);
  if (!existing) throw new Error("Project not found.");
  const now = nowIso();

  sqlite
    .prepare(
      `UPDATE "deployment_project" SET
        "name" = ?,
        "provider" = ?,
        "status" = ?,
        "siteId" = ?,
        "productionBranch" = ?,
        "framework" = ?,
        "rootDirectory" = ?,
        "buildCommand" = ?,
        "outputDirectory" = ?,
        "vercelProjectId" = ?,
        "cloudflareProjectName" = ?,
        "currentDeploymentId" = ?,
        "lastPublishedAt" = ?,
        "metadataJson" = ?,
        "updatedAt" = ?
      WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      input.name?.trim() ?? existing.name,
      input.provider ?? existing.provider,
      input.status ?? existing.status,
      input.siteId !== undefined ? input.siteId : existing.siteId,
      input.productionBranch ?? existing.productionBranch,
      input.framework ?? existing.framework,
      input.rootDirectory ?? existing.rootDirectory,
      input.buildCommand !== undefined
        ? input.buildCommand
        : existing.buildCommand,
      input.outputDirectory !== undefined
        ? input.outputDirectory
        : existing.outputDirectory,
      input.vercelProjectId !== undefined
        ? input.vercelProjectId
        : existing.vercelProjectId,
      input.cloudflareProjectName !== undefined
        ? input.cloudflareProjectName
        : existing.cloudflareProjectName,
      input.currentDeploymentId !== undefined
        ? input.currentDeploymentId
        : existing.currentDeploymentId,
      input.lastPublishedAt !== undefined
        ? input.lastPublishedAt
        : existing.lastPublishedAt,
      JSON.stringify(input.metadata ?? existing.metadata),
      now,
      projectId,
      workspaceId,
    );

  return getProjectById(workspaceId, projectId)!;
}

export function deleteProject(workspaceId: string, projectId: string): void {
  const existing = getProjectById(workspaceId, projectId);
  if (!existing) throw new Error("Project not found.");
  sqlite
    .prepare(
      `DELETE FROM "deployment_project" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(projectId, workspaceId);
}

export function listDomains(
  workspaceId: string,
  filters: { projectId?: string; status?: string; limit?: number } = {},
): DeploymentDomain[] {
  ensureDeploymentReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.projectId) {
    clauses.push(`"projectId" = ?`);
    params.push(filters.projectId);
  }
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  params.push(filters.limit ?? 200);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "deployment_domain"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "isPrimary" DESC, "createdAt" DESC
       LIMIT ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToDomain);
}

export function getDomainById(
  workspaceId: string,
  domainId: string,
): DeploymentDomain | null {
  ensureDeploymentReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "deployment_domain" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(domainId, workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToDomain(row) : null;
}

export function getDomainByHostname(
  hostname: string,
): DeploymentDomain | null {
  ensureDeploymentReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "deployment_domain" WHERE lower("hostname") = lower(?)`,
    )
    .get(hostname) as Record<string, unknown> | undefined;
  return row ? rowToDomain(row) : null;
}

export function createDomain(
  workspaceId: string,
  input: {
    projectId: string;
    hostname: string;
    isPrimary?: boolean;
    verificationToken: string;
    dnsProvider?: DomainDnsProvider;
    cnameTarget?: string | null;
    aRecordTarget?: string | null;
    sslProvider?: SslProvider;
  },
): DeploymentDomain {
  const project = getProjectById(workspaceId, input.projectId);
  if (!project) throw new Error("Project not found.");

  const taken = getDomainByHostname(input.hostname);
  if (taken) throw new Error("That custom domain is already in use.");

  const now = nowIso();
  const id = randomUUID();

  if (input.isPrimary) {
    sqlite
      .prepare(
        `UPDATE "deployment_domain" SET "isPrimary" = 0, "updatedAt" = ?
         WHERE "workspaceId" = ? AND "projectId" = ?`,
      )
      .run(now, workspaceId, input.projectId);
  }

  sqlite
    .prepare(
      `INSERT INTO "deployment_domain" (
        "id", "workspaceId", "projectId", "hostname", "status", "isPrimary",
        "verificationMethod", "verificationToken", "dnsProvider",
        "cnameTarget", "aRecordTarget", "sslStatus", "sslProvider",
        "metadataJson", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, 'pending', ?, 'txt', ?, ?, ?, ?, 'pending', ?, '{}', ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.projectId,
      input.hostname,
      input.isPrimary ? 1 : 0,
      input.verificationToken,
      input.dnsProvider ?? "manual",
      input.cnameTarget ?? null,
      input.aRecordTarget ?? null,
      input.sslProvider ?? "auto",
      now,
      now,
    );

  return getDomainById(workspaceId, id)!;
}

export function updateDomain(
  workspaceId: string,
  domainId: string,
  input: Partial<{
    status: DomainStatus;
    isPrimary: boolean;
    verifiedAt: string | null;
    dnsProvider: DomainDnsProvider;
    cnameTarget: string | null;
    aRecordTarget: string | null;
    sslStatus: SslStatus;
    sslProvider: SslProvider;
    sslIssuedAt: string | null;
    sslExpiresAt: string | null;
    lastDnsCheckAt: string | null;
    lastDnsError: string | null;
    metadata: Record<string, unknown>;
  }>,
): DeploymentDomain {
  const existing = getDomainById(workspaceId, domainId);
  if (!existing) throw new Error("Domain not found.");
  const now = nowIso();

  if (input.isPrimary) {
    sqlite
      .prepare(
        `UPDATE "deployment_domain" SET "isPrimary" = 0, "updatedAt" = ?
         WHERE "workspaceId" = ? AND "projectId" = ? AND "id" != ?`,
      )
      .run(now, workspaceId, existing.projectId, domainId);
  }

  sqlite
    .prepare(
      `UPDATE "deployment_domain" SET
        "status" = ?,
        "isPrimary" = ?,
        "verifiedAt" = ?,
        "dnsProvider" = ?,
        "cnameTarget" = ?,
        "aRecordTarget" = ?,
        "sslStatus" = ?,
        "sslProvider" = ?,
        "sslIssuedAt" = ?,
        "sslExpiresAt" = ?,
        "lastDnsCheckAt" = ?,
        "lastDnsError" = ?,
        "metadataJson" = ?,
        "updatedAt" = ?
      WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      input.status ?? existing.status,
      (input.isPrimary ?? existing.isPrimary) ? 1 : 0,
      input.verifiedAt !== undefined ? input.verifiedAt : existing.verifiedAt,
      input.dnsProvider ?? existing.dnsProvider,
      input.cnameTarget !== undefined
        ? input.cnameTarget
        : existing.cnameTarget,
      input.aRecordTarget !== undefined
        ? input.aRecordTarget
        : existing.aRecordTarget,
      input.sslStatus ?? existing.sslStatus,
      input.sslProvider ?? existing.sslProvider,
      input.sslIssuedAt !== undefined
        ? input.sslIssuedAt
        : existing.sslIssuedAt,
      input.sslExpiresAt !== undefined
        ? input.sslExpiresAt
        : existing.sslExpiresAt,
      input.lastDnsCheckAt !== undefined
        ? input.lastDnsCheckAt
        : existing.lastDnsCheckAt,
      input.lastDnsError !== undefined
        ? input.lastDnsError
        : existing.lastDnsError,
      JSON.stringify(input.metadata ?? existing.metadata),
      now,
      domainId,
      workspaceId,
    );

  return getDomainById(workspaceId, domainId)!;
}

export function deleteDomain(workspaceId: string, domainId: string): void {
  const existing = getDomainById(workspaceId, domainId);
  if (!existing) throw new Error("Domain not found.");
  sqlite
    .prepare(
      `DELETE FROM "deployment_domain" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(domainId, workspaceId);
}

export function listEnvVars(
  workspaceId: string,
  projectId?: string,
): DeploymentEnvVar[] {
  ensureDeploymentReady();
  if (projectId) {
    const rows = sqlite
      .prepare(
        `SELECT * FROM "deployment_env_var"
         WHERE "workspaceId" = ? AND "projectId" = ?
         ORDER BY "key" ASC`,
      )
      .all(workspaceId, projectId) as Record<string, unknown>[];
    return rows.map(rowToEnvVar);
  }
  const rows = sqlite
    .prepare(
      `SELECT * FROM "deployment_env_var"
       WHERE "workspaceId" = ?
       ORDER BY "projectId", "key" ASC`,
    )
    .all(workspaceId) as Record<string, unknown>[];
  return rows.map(rowToEnvVar);
}

export function getEnvVarById(
  workspaceId: string,
  envId: string,
): DeploymentEnvVar | null {
  ensureDeploymentReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "deployment_env_var" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(envId, workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToEnvVar(row) : null;
}

export function upsertEnvVar(
  workspaceId: string,
  input: {
    projectId: string;
    key: string;
    value: string;
    isSecret?: boolean;
    target?: EnvTarget;
  },
): DeploymentEnvVar {
  const project = getProjectById(workspaceId, input.projectId);
  if (!project) throw new Error("Project not found.");

  const target = input.target ?? "production";
  const now = nowIso();
  const existing = sqlite
    .prepare(
      `SELECT * FROM "deployment_env_var"
       WHERE "projectId" = ? AND "key" = ? AND "target" = ?`,
    )
    .get(input.projectId, input.key, target) as
    | Record<string, unknown>
    | undefined;

  if (existing) {
    sqlite
      .prepare(
        `UPDATE "deployment_env_var" SET
          "value" = ?, "isSecret" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
      )
      .run(
        input.value,
        (input.isSecret ?? Boolean(existing.isSecret)) ? 1 : 0,
        now,
        String(existing.id),
      );
    return getEnvVarById(workspaceId, String(existing.id))!;
  }

  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "deployment_env_var" (
        "id", "workspaceId", "projectId", "key", "value", "isSecret",
        "target", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.projectId,
      input.key,
      input.value,
      (input.isSecret ?? true) ? 1 : 0,
      target,
      now,
      now,
    );
  return getEnvVarById(workspaceId, id)!;
}

export function deleteEnvVar(workspaceId: string, envId: string): void {
  const existing = getEnvVarById(workspaceId, envId);
  if (!existing) throw new Error("Environment variable not found.");
  sqlite
    .prepare(
      `DELETE FROM "deployment_env_var" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(envId, workspaceId);
}

export function listDeployments(
  workspaceId: string,
  filters: DeploymentListFilters = {},
): DeploymentRecord[] {
  ensureDeploymentReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.projectId) {
    clauses.push(`"projectId" = ?`);
    params.push(filters.projectId);
  }
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.provider) {
    clauses.push(`"provider" = ?`);
    params.push(filters.provider);
  }
  if (filters.environment) {
    clauses.push(`"environment" = ?`);
    params.push(filters.environment);
  }
  if (filters.q) {
    clauses.push(
      `("commitMessage" LIKE ? ESCAPE '\\' OR "commitSha" LIKE ? ESCAPE '\\' OR "url" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "deployment"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToDeployment);
}

export function getDeploymentById(
  workspaceId: string,
  deploymentId: string,
): DeploymentRecord | null {
  ensureDeploymentReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "deployment" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(deploymentId, workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToDeployment(row) : null;
}

export function createDeploymentRecord(
  workspaceId: string,
  input: {
    projectId: string;
    status?: DeploymentStatus;
    provider: DeploymentProvider;
    environment?: DeploymentEnvironment;
    trigger?: DeploymentTrigger;
    commitSha?: string | null;
    commitMessage?: string | null;
    branch?: string | null;
    url?: string | null;
    inspectorUrl?: string | null;
    providerDeploymentId?: string | null;
    previousDeploymentId?: string | null;
    isRollback?: boolean;
    rolledBackFromId?: string | null;
    createdByUserId?: string | null;
    metadata?: Record<string, unknown>;
  },
): DeploymentRecord {
  const project = getProjectById(workspaceId, input.projectId);
  if (!project) throw new Error("Project not found.");

  const now = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "deployment" (
        "id", "workspaceId", "projectId", "status", "provider", "environment",
        "trigger", "commitSha", "commitMessage", "branch", "url", "inspectorUrl",
        "providerDeploymentId", "previousDeploymentId", "isRollback",
        "rolledBackFromId", "metadataJson", "createdByUserId", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.projectId,
      input.status ?? "queued",
      input.provider,
      input.environment ?? "production",
      input.trigger ?? "manual",
      input.commitSha ?? null,
      input.commitMessage ?? null,
      input.branch ?? project.productionBranch,
      input.url ?? null,
      input.inspectorUrl ?? null,
      input.providerDeploymentId ?? null,
      input.previousDeploymentId ?? null,
      input.isRollback ? 1 : 0,
      input.rolledBackFromId ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.createdByUserId ?? null,
      now,
      now,
    );

  return getDeploymentById(workspaceId, id)!;
}

export function updateDeploymentRecord(
  workspaceId: string,
  deploymentId: string,
  input: Partial<{
    status: DeploymentStatus;
    url: string | null;
    inspectorUrl: string | null;
    providerDeploymentId: string | null;
    buildStartedAt: string | null;
    buildFinishedAt: string | null;
    publishedAt: string | null;
    failedAt: string | null;
    errorMessage: string | null;
    durationMs: number | null;
    metadata: Record<string, unknown>;
  }>,
): DeploymentRecord {
  const existing = getDeploymentById(workspaceId, deploymentId);
  if (!existing) throw new Error("Deployment not found.");
  const now = nowIso();

  sqlite
    .prepare(
      `UPDATE "deployment" SET
        "status" = ?,
        "url" = ?,
        "inspectorUrl" = ?,
        "providerDeploymentId" = ?,
        "buildStartedAt" = ?,
        "buildFinishedAt" = ?,
        "publishedAt" = ?,
        "failedAt" = ?,
        "errorMessage" = ?,
        "durationMs" = ?,
        "metadataJson" = ?,
        "updatedAt" = ?
      WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      input.status ?? existing.status,
      input.url !== undefined ? input.url : existing.url,
      input.inspectorUrl !== undefined
        ? input.inspectorUrl
        : existing.inspectorUrl,
      input.providerDeploymentId !== undefined
        ? input.providerDeploymentId
        : existing.providerDeploymentId,
      input.buildStartedAt !== undefined
        ? input.buildStartedAt
        : existing.buildStartedAt,
      input.buildFinishedAt !== undefined
        ? input.buildFinishedAt
        : existing.buildFinishedAt,
      input.publishedAt !== undefined
        ? input.publishedAt
        : existing.publishedAt,
      input.failedAt !== undefined ? input.failedAt : existing.failedAt,
      input.errorMessage !== undefined
        ? input.errorMessage
        : existing.errorMessage,
      input.durationMs !== undefined ? input.durationMs : existing.durationMs,
      JSON.stringify(input.metadata ?? existing.metadata),
      now,
      deploymentId,
      workspaceId,
    );

  return getDeploymentById(workspaceId, deploymentId)!;
}

export function appendBuildLog(
  workspaceId: string,
  deploymentId: string,
  message: string,
  level: BuildLogLevel = "info",
): DeploymentBuildLog {
  const deployment = getDeploymentById(workspaceId, deploymentId);
  if (!deployment) throw new Error("Deployment not found.");

  const maxRow = sqlite
    .prepare(
      `SELECT MAX("sequence") as maxSeq FROM "deployment_build_log"
       WHERE "deploymentId" = ?`,
    )
    .get(deploymentId) as { maxSeq: number | null };
  const sequence = (maxRow?.maxSeq ?? -1) + 1;
  const id = randomUUID();
  const now = nowIso();

  sqlite
    .prepare(
      `INSERT INTO "deployment_build_log" (
        "id", "workspaceId", "deploymentId", "level", "message", "sequence", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, workspaceId, deploymentId, level, message, sequence, now);

  return {
    id,
    workspaceId,
    deploymentId,
    level,
    message,
    sequence,
    createdAt: now,
  };
}

export function listBuildLogs(
  workspaceId: string,
  deploymentId: string,
): DeploymentBuildLog[] {
  ensureDeploymentReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "deployment_build_log"
       WHERE "workspaceId" = ? AND "deploymentId" = ?
       ORDER BY "sequence" ASC`,
    )
    .all(workspaceId, deploymentId) as Record<string, unknown>[];
  return rows.map(rowToBuildLog);
}

export function createHealthCheck(
  workspaceId: string,
  input: {
    projectId: string;
    domainId?: string | null;
    deploymentId?: string | null;
    url: string;
    status: HealthStatus;
    httpStatus?: number | null;
    latencyMs?: number | null;
    errorMessage?: string | null;
    checkedAt?: string;
  },
): DeploymentHealthCheck {
  const now = nowIso();
  const id = randomUUID();
  const checkedAt = input.checkedAt ?? now;
  sqlite
    .prepare(
      `INSERT INTO "deployment_health_check" (
        "id", "workspaceId", "projectId", "domainId", "deploymentId", "url",
        "status", "httpStatus", "latencyMs", "errorMessage", "checkedAt", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.projectId,
      input.domainId ?? null,
      input.deploymentId ?? null,
      input.url,
      input.status,
      input.httpStatus ?? null,
      input.latencyMs ?? null,
      input.errorMessage ?? null,
      checkedAt,
      now,
    );
  return getHealthCheckById(workspaceId, id)!;
}

export function getHealthCheckById(
  workspaceId: string,
  checkId: string,
): DeploymentHealthCheck | null {
  ensureDeploymentReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "deployment_health_check" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(checkId, workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToHealthCheck(row) : null;
}

export function listHealthChecks(
  workspaceId: string,
  filters: { projectId?: string; limit?: number } = {},
): DeploymentHealthCheck[] {
  ensureDeploymentReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.projectId) {
    clauses.push(`"projectId" = ?`);
    params.push(filters.projectId);
  }
  params.push(filters.limit ?? 100);
  const rows = sqlite
    .prepare(
      `SELECT * FROM "deployment_health_check"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "checkedAt" DESC
       LIMIT ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToHealthCheck);
}

export function createMonitorEvent(
  workspaceId: string,
  input: {
    type: MonitorEventType;
    title: string;
    severity?: MonitorSeverity;
    message?: string | null;
    projectId?: string | null;
    deploymentId?: string | null;
    domainId?: string | null;
    metadata?: Record<string, unknown>;
  },
): DeploymentMonitorEvent {
  const settings = ensureWorkspaceDeployment(workspaceId);
  if (!settings.monitoringEnabled) {
    const now = nowIso();
    return {
      id: randomUUID(),
      workspaceId,
      projectId: input.projectId ?? null,
      deploymentId: input.deploymentId ?? null,
      domainId: input.domainId ?? null,
      type: input.type,
      severity: input.severity ?? "info",
      title: input.title,
      message: input.message ?? null,
      metadata: input.metadata ?? {},
      occurredAt: now,
      createdAt: now,
    };
  }

  const now = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "deployment_monitor_event" (
        "id", "workspaceId", "projectId", "deploymentId", "domainId",
        "type", "severity", "title", "message", "metadataJson",
        "occurredAt", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.projectId ?? null,
      input.deploymentId ?? null,
      input.domainId ?? null,
      input.type,
      input.severity ?? "info",
      input.title,
      input.message ?? null,
      JSON.stringify(input.metadata ?? {}),
      now,
      now,
    );

  return {
    id,
    workspaceId,
    projectId: input.projectId ?? null,
    deploymentId: input.deploymentId ?? null,
    domainId: input.domainId ?? null,
    type: input.type,
    severity: input.severity ?? "info",
    title: input.title,
    message: input.message ?? null,
    metadata: input.metadata ?? {},
    occurredAt: now,
    createdAt: now,
  };
}

export function listMonitorEvents(
  workspaceId: string,
  filters: { projectId?: string; limit?: number } = {},
): DeploymentMonitorEvent[] {
  ensureDeploymentReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.projectId) {
    clauses.push(`"projectId" = ?`);
    params.push(filters.projectId);
  }
  params.push(filters.limit ?? 100);
  const rows = sqlite
    .prepare(
      `SELECT * FROM "deployment_monitor_event"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "occurredAt" DESC
       LIMIT ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToMonitorEvent);
}

export function createDeploymentLog(
  workspaceId: string,
  input: {
    operation: string;
    status?: DeploymentLogStatus;
    projectId?: string | null;
    deploymentId?: string | null;
    requestSummary?: string | null;
    responseSummary?: string | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
  },
): DeploymentOpLog {
  const now = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "deployment_log" (
        "id", "workspaceId", "projectId", "deploymentId", "operation", "status",
        "requestSummary", "responseSummary", "errorMessage", "metadataJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      input.projectId ?? null,
      input.deploymentId ?? null,
      input.operation,
      input.status ?? "success",
      input.requestSummary ?? null,
      input.responseSummary ?? null,
      input.errorMessage ?? null,
      JSON.stringify(input.metadata ?? {}),
      now,
    );
  return {
    id,
    workspaceId,
    projectId: input.projectId ?? null,
    deploymentId: input.deploymentId ?? null,
    operation: input.operation,
    status: input.status ?? "success",
    requestSummary: input.requestSummary ?? null,
    responseSummary: input.responseSummary ?? null,
    errorMessage: input.errorMessage ?? null,
    metadata: input.metadata ?? {},
    createdAt: now,
  };
}

export function listDeploymentLogs(
  workspaceId: string,
  filters: { limit?: number } = {},
): DeploymentOpLog[] {
  ensureDeploymentReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "deployment_log"
       WHERE "workspaceId" = ?
       ORDER BY "createdAt" DESC
       LIMIT ?`,
    )
    .all(workspaceId, filters.limit ?? 100) as Record<string, unknown>[];
  return rows.map(rowToOpLog);
}

/**
 * Mark orphaned queued/building deployments as failed (process kill, hung fetch).
 * Protects currentDeploymentId and previousDeploymentId from prune races.
 */
export function failStaleDeployments(
  workspaceId: string,
  projectId?: string,
  olderThanMs = 30 * 60_000,
): number {
  ensureDeploymentReady();
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const clauses = [
    `"workspaceId" = ?`,
    `"status" IN ('queued', 'building')`,
    `"createdAt" < ?`,
  ];
  const params: unknown[] = [workspaceId, cutoff];
  if (projectId) {
    clauses.push(`"projectId" = ?`);
    params.push(projectId);
  }

  const rows = sqlite
    .prepare(
      `SELECT "id" FROM "deployment" WHERE ${clauses.join(" AND ")}`,
    )
    .all(...params) as Array<{ id: string }>;

  const failedAt = nowIso();
  for (const row of rows) {
    updateDeploymentRecord(workspaceId, row.id, {
      status: "failed",
      failedAt,
      errorMessage: "Timed out while building (stale deployment recovery).",
      buildFinishedAt: failedAt,
    });
  }
  return rows.length;
}

export function pruneOldDeployments(
  workspaceId: string,
  projectId: string,
  retention: number,
): void {
  const keep = Math.max(5, retention);
  const project = getProjectById(workspaceId, projectId);
  const protect = new Set<string>();
  if (project?.currentDeploymentId) protect.add(project.currentDeploymentId);

  const rows = sqlite
    .prepare(
      `SELECT "id", "previousDeploymentId" FROM "deployment"
       WHERE "workspaceId" = ? AND "projectId" = ?
       ORDER BY "createdAt" DESC
       LIMIT -1 OFFSET ?`,
    )
    .all(workspaceId, projectId, keep) as Array<{
    id: string;
    previousDeploymentId: string | null;
  }>;

  // Also protect previousDeploymentId of the current release for rollback.
  if (project?.currentDeploymentId) {
    const current = getDeploymentById(workspaceId, project.currentDeploymentId);
    if (current?.previousDeploymentId) protect.add(current.previousDeploymentId);
  }

  for (const row of rows) {
    if (protect.has(row.id)) continue;
    sqlite.prepare(`DELETE FROM "deployment" WHERE "id" = ?`).run(row.id);
  }
}

export function getDeploymentOverview(
  workspaceId: string,
): DeploymentOverviewStats {
  const settings = ensureWorkspaceDeployment(workspaceId);
  const today = todayStartIso();

  const projects = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "deployment_project" WHERE "workspaceId" = ?`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  const activeProjects = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "deployment_project"
         WHERE "workspaceId" = ? AND "status" = 'active'`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  const domains = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "deployment_domain" WHERE "workspaceId" = ?`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  const verifiedDomains = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "deployment_domain"
         WHERE "workspaceId" = ? AND "status" = 'verified'`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  const deployments = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "deployment" WHERE "workspaceId" = ?`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  const publishedToday = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "deployment"
         WHERE "workspaceId" = ? AND "status" = 'published' AND "publishedAt" >= ?`,
      )
      .get(workspaceId, today) as { c: number }
  ).c;

  const failedToday = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "deployment"
         WHERE "workspaceId" = ? AND "status" = 'failed' AND "failedAt" >= ?`,
      )
      .get(workspaceId, today) as { c: number }
  ).c;

  const healthyChecks = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "deployment_health_check"
         WHERE "workspaceId" = ? AND "status" = 'healthy' AND "checkedAt" >= ?`,
      )
      .get(workspaceId, today) as { c: number }
  ).c;

  const downChecks = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "deployment_health_check"
         WHERE "workspaceId" = ? AND "status" = 'down' AND "checkedAt" >= ?`,
      )
      .get(workspaceId, today) as { c: number }
  ).c;

  const envVars = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "deployment_env_var" WHERE "workspaceId" = ?`,
      )
      .get(workspaceId) as { c: number }
  ).c;

  return {
    projects,
    activeProjects,
    domains,
    verifiedDomains,
    deployments,
    publishedToday,
    failedToday,
    healthyChecks,
    downChecks,
    envVars,
    defaultProvider: settings.defaultProvider,
    autoSslEnabled: settings.autoSslEnabled,
    healthChecksEnabled: settings.healthChecksEnabled,
    monitoringEnabled: settings.monitoringEnabled,
    hasVercelToken: Boolean(settings.vercelToken),
    hasCloudflareToken: Boolean(settings.cloudflareApiToken),
  };
}
