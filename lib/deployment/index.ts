export * from "@/lib/deployment/types";
export {
  DEFAULT_DEPLOYMENT_PROVIDER,
  DEFAULT_PRODUCTION_BRANCH,
  DEFAULT_FRAMEWORK,
  DEFAULT_HEALTH_CHECK_PATH,
  DEFAULT_HEALTH_CHECK_INTERVAL_SEC,
  DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
  DEFAULT_RETENTION_DEPLOYMENTS,
  DEFAULT_CNAME_TARGET,
  DEFAULT_CLOUDFLARE_CNAME_TARGET,
  slugify,
  maskSecret,
  generateVerificationToken,
  generateCommitSha,
  normalizeHostname,
  isValidHostname,
  isValidEnvKey,
  normalizeEnvKey,
  truncateSummary,
  defaultCnameTarget,
} from "@/lib/deployment/defaults";
export { migrateDeploymentSchema } from "@/lib/deployment/migrate";
export type {
  DeploymentSettingsPublic,
  DeploymentEnvVarPublic,
} from "@/lib/deployment/repository";
export {
  ensureDeploymentReady,
  ensureWorkspaceDeployment,
  getDeploymentSettings,
  updateDeploymentSettings,
  toPublicSettings,
  toPublicEnvVar,
  listProjects,
  getProjectById,
  getProjectBySlug,
  createProject,
  updateProject,
  deleteProject,
  listDomains,
  getDomainById,
  getDomainByHostname,
  createDomain,
  updateDomain,
  deleteDomain,
  listEnvVars,
  getEnvVarById,
  upsertEnvVar,
  deleteEnvVar,
  listDeployments,
  getDeploymentById,
  createDeploymentRecord,
  updateDeploymentRecord,
  appendBuildLog,
  listBuildLogs,
  createHealthCheck,
  listHealthChecks,
  createMonitorEvent,
  listMonitorEvents,
  createDeploymentLog,
  listDeploymentLogs,
  getDeploymentOverview,
} from "@/lib/deployment/repository";
export { runPublishPipeline } from "@/lib/deployment/engine/publish";
export { rollbackDeployment } from "@/lib/deployment/engine/rollback";
export {
  addCustomDomain,
  verifyDomain,
  removeDomain,
  getDomainVerificationInstructions,
} from "@/lib/deployment/engine/domains";
export {
  runHealthCheck,
  runWorkspaceHealthChecks,
  getRecentHealth,
} from "@/lib/deployment/engine/health";
export {
  testVercelConnection,
  createVercelDeployment,
} from "@/lib/deployment/engine/vercel";
export {
  testCloudflareConnection,
  createCloudflareDeployment,
  ensureCloudflareDnsRecord,
} from "@/lib/deployment/engine/cloudflare";
export { provisionSsl } from "@/lib/deployment/engine/ssl";
export {
  verifyTxtRecord,
  verifyCnameRecord,
  dnsInstructions,
} from "@/lib/deployment/engine/dns";
