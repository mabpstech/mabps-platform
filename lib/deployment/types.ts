export const DEPLOYMENT_PROVIDERS = ["vercel", "cloudflare", "manual"] as const;
export type DeploymentProvider = (typeof DEPLOYMENT_PROVIDERS)[number];

export const DEPLOYMENT_PROJECT_STATUSES = [
  "active",
  "paused",
  "archived",
] as const;
export type DeploymentProjectStatus =
  (typeof DEPLOYMENT_PROJECT_STATUSES)[number];

export const DEPLOYMENT_STATUSES = [
  "queued",
  "building",
  "ready",
  "published",
  "failed",
  "cancelled",
  "rolled_back",
] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export const DEPLOYMENT_ENVIRONMENTS = [
  "production",
  "preview",
  "development",
] as const;
export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number];

export const DEPLOYMENT_TRIGGERS = [
  "manual",
  "api",
  "webhook",
  "rollback",
  "domain_verify",
] as const;
export type DeploymentTrigger = (typeof DEPLOYMENT_TRIGGERS)[number];

export const DOMAIN_STATUSES = [
  "pending",
  "verifying",
  "verified",
  "failed",
  "removed",
] as const;
export type DomainStatus = (typeof DOMAIN_STATUSES)[number];

export const DOMAIN_DNS_PROVIDERS = [
  "manual",
  "cloudflare",
  "vercel",
] as const;
export type DomainDnsProvider = (typeof DOMAIN_DNS_PROVIDERS)[number];

export const SSL_STATUSES = [
  "pending",
  "provisioning",
  "active",
  "expiring",
  "failed",
] as const;
export type SslStatus = (typeof SSL_STATUSES)[number];

export const SSL_PROVIDERS = ["auto", "vercel", "cloudflare", "custom"] as const;
export type SslProvider = (typeof SSL_PROVIDERS)[number];

export const ENV_TARGETS = ["production", "preview", "development", "all"] as const;
export type EnvTarget = (typeof ENV_TARGETS)[number];

export const BUILD_LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type BuildLogLevel = (typeof BUILD_LOG_LEVELS)[number];

export const HEALTH_STATUSES = [
  "healthy",
  "degraded",
  "down",
  "unknown",
] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const MONITOR_SEVERITIES = ["info", "warning", "critical"] as const;
export type MonitorSeverity = (typeof MONITOR_SEVERITIES)[number];

export const MONITOR_EVENT_TYPES = [
  "deployment_started",
  "deployment_ready",
  "deployment_failed",
  "deployment_published",
  "rollback",
  "domain_verified",
  "domain_failed",
  "ssl_active",
  "ssl_failed",
  "health_ok",
  "health_down",
  "env_updated",
  "settings_updated",
] as const;
export type MonitorEventType = (typeof MONITOR_EVENT_TYPES)[number];

export const DEPLOYMENT_LOG_STATUSES = ["success", "error"] as const;
export type DeploymentLogStatus = (typeof DEPLOYMENT_LOG_STATUSES)[number];

export type DeploymentSettings = {
  id: string;
  workspaceId: string;
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
  createdAt: string;
  updatedAt: string;
};

export type DeploymentProject = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
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
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeploymentDomain = {
  id: string;
  workspaceId: string;
  projectId: string;
  hostname: string;
  status: DomainStatus;
  isPrimary: boolean;
  verificationMethod: "txt" | "cname";
  verificationToken: string;
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
  createdAt: string;
  updatedAt: string;
};

export type DeploymentEnvVar = {
  id: string;
  workspaceId: string;
  projectId: string;
  key: string;
  value: string;
  isSecret: boolean;
  target: EnvTarget;
  createdAt: string;
  updatedAt: string;
};

export type DeploymentRecord = {
  id: string;
  workspaceId: string;
  projectId: string;
  status: DeploymentStatus;
  provider: DeploymentProvider;
  environment: DeploymentEnvironment;
  trigger: DeploymentTrigger;
  commitSha: string | null;
  commitMessage: string | null;
  branch: string | null;
  url: string | null;
  inspectorUrl: string | null;
  providerDeploymentId: string | null;
  previousDeploymentId: string | null;
  isRollback: boolean;
  rolledBackFromId: string | null;
  buildStartedAt: string | null;
  buildFinishedAt: string | null;
  publishedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  metadata: Record<string, unknown>;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeploymentBuildLog = {
  id: string;
  workspaceId: string;
  deploymentId: string;
  level: BuildLogLevel;
  message: string;
  sequence: number;
  createdAt: string;
};

export type DeploymentHealthCheck = {
  id: string;
  workspaceId: string;
  projectId: string;
  domainId: string | null;
  deploymentId: string | null;
  url: string;
  status: HealthStatus;
  httpStatus: number | null;
  latencyMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
  createdAt: string;
};

export type DeploymentMonitorEvent = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  deploymentId: string | null;
  domainId: string | null;
  type: MonitorEventType;
  severity: MonitorSeverity;
  title: string;
  message: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

export type DeploymentOpLog = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  deploymentId: string | null;
  operation: string;
  status: DeploymentLogStatus;
  requestSummary: string | null;
  responseSummary: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type DeploymentOverviewStats = {
  projects: number;
  activeProjects: number;
  domains: number;
  verifiedDomains: number;
  deployments: number;
  publishedToday: number;
  failedToday: number;
  healthyChecks: number;
  downChecks: number;
  envVars: number;
  defaultProvider: DeploymentProvider;
  autoSslEnabled: boolean;
  healthChecksEnabled: boolean;
  monitoringEnabled: boolean;
  hasVercelToken: boolean;
  hasCloudflareToken: boolean;
};

export type DeploymentListFilters = {
  q?: string;
  status?: string;
  provider?: string;
  projectId?: string;
  environment?: string;
  limit?: number;
  offset?: number;
};
