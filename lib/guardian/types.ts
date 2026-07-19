export const GUARDIAN_CHECK_CATEGORIES = [
  "database",
  "api",
  "deployment",
  "env",
  "dependencies",
  "integrity",
  "performance",
  "security",
  "logs",
  "system",
] as const;
export type GuardianCheckCategory = (typeof GUARDIAN_CHECK_CATEGORIES)[number];

export const GUARDIAN_SEVERITIES = [
  "info",
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type GuardianSeverity = (typeof GUARDIAN_SEVERITIES)[number];

export const GUARDIAN_HEALTH_STATUSES = [
  "healthy",
  "degraded",
  "unhealthy",
  "unknown",
] as const;
export type GuardianHealthStatus = (typeof GUARDIAN_HEALTH_STATUSES)[number];

export const GUARDIAN_SCAN_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;
export type GuardianScanStatus = (typeof GUARDIAN_SCAN_STATUSES)[number];

export const GUARDIAN_SCAN_TRIGGERS = [
  "manual",
  "api",
  "schedule",
  "monitor",
  "startup",
] as const;
export type GuardianScanTrigger = (typeof GUARDIAN_SCAN_TRIGGERS)[number];

export const GUARDIAN_FINDING_STATUSES = [
  "open",
  "acknowledged",
  "repairing",
  "resolved",
  "ignored",
  "failed",
] as const;
export type GuardianFindingStatus = (typeof GUARDIAN_FINDING_STATUSES)[number];

export const GUARDIAN_REPAIR_STATUSES = [
  "suggested",
  "approved",
  "applying",
  "applied",
  "failed",
  "dismissed",
  "manual",
] as const;
export type GuardianRepairStatus = (typeof GUARDIAN_REPAIR_STATUSES)[number];

export const GUARDIAN_REPAIR_ACTIONS = [
  "run_migration",
  "enable_foreign_keys",
  "vacuum_database",
  "create_workspace_settings",
  "clear_stale_cache",
  "document_env_var",
  "install_dependency",
  "rotate_secret",
  "review_security",
  "retry_health_check",
  "analyze_logs",
  "custom",
] as const;
export type GuardianRepairAction = (typeof GUARDIAN_REPAIR_ACTIONS)[number];

export const GUARDIAN_CHECK_RESULT_STATUSES = [
  "pass",
  "warn",
  "fail",
  "skip",
  "error",
] as const;
export type GuardianCheckResultStatus =
  (typeof GUARDIAN_CHECK_RESULT_STATUSES)[number];

export const GUARDIAN_MONITOR_EVENT_TYPES = [
  "scan_started",
  "scan_completed",
  "scan_failed",
  "finding_opened",
  "finding_resolved",
  "repair_applied",
  "repair_failed",
  "health_ok",
  "health_degraded",
  "health_unhealthy",
  "monitor_tick",
  "settings_updated",
  "troubleshoot_completed",
] as const;
export type GuardianMonitorEventType =
  (typeof GUARDIAN_MONITOR_EVENT_TYPES)[number];

export const GUARDIAN_LOG_STATUSES = ["success", "error"] as const;
export type GuardianLogStatus = (typeof GUARDIAN_LOG_STATUSES)[number];

export type GuardianSettings = {
  id: string;
  workspaceId: string;
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
  createdAt: string;
  updatedAt: string;
};

export type GuardianScan = {
  id: string;
  workspaceId: string;
  status: GuardianScanStatus;
  trigger: GuardianScanTrigger;
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
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GuardianFinding = {
  id: string;
  workspaceId: string;
  scanId: string | null;
  category: GuardianCheckCategory;
  code: string;
  title: string;
  description: string;
  severity: GuardianSeverity;
  status: GuardianFindingStatus;
  evidence: Record<string, unknown>;
  suggestion: string | null;
  autoRepairable: boolean;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GuardianRepair = {
  id: string;
  workspaceId: string;
  findingId: string | null;
  scanId: string | null;
  action: GuardianRepairAction;
  title: string;
  description: string;
  status: GuardianRepairStatus;
  oneClick: boolean;
  riskLevel: GuardianSeverity;
  steps: string[];
  resultSummary: string | null;
  errorMessage: string | null;
  appliedAt: string | null;
  appliedByUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GuardianCheckResult = {
  id: string;
  workspaceId: string;
  scanId: string;
  category: GuardianCheckCategory;
  checkKey: string;
  title: string;
  status: GuardianCheckResultStatus;
  severity: GuardianSeverity;
  message: string;
  latencyMs: number | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export type GuardianMonitorEvent = {
  id: string;
  workspaceId: string;
  scanId: string | null;
  findingId: string | null;
  repairId: string | null;
  type: GuardianMonitorEventType;
  severity: GuardianSeverity;
  title: string;
  message: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

export type GuardianOpLog = {
  id: string;
  workspaceId: string;
  scanId: string | null;
  findingId: string | null;
  repairId: string | null;
  operation: string;
  status: GuardianLogStatus;
  requestSummary: string | null;
  responseSummary: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type GuardianOverviewStats = {
  healthStatus: GuardianHealthStatus;
  scans: number;
  scansToday: number;
  openFindings: number;
  criticalFindings: number;
  highFindings: number;
  suggestedRepairs: number;
  appliedRepairs: number;
  lastScanAt: string | null;
  lastScanHealth: GuardianHealthStatus | null;
  monitoringEnabled: boolean;
  autoScanEnabled: boolean;
  aiTroubleshootingEnabled: boolean;
  securityChecksEnabled: boolean;
  performanceChecksEnabled: boolean;
  logAnalysisEnabled: boolean;
  checkBreakdown: Record<GuardianCheckCategory, number>;
};

export type GuardianListFilters = {
  q?: string;
  status?: string;
  category?: string;
  severity?: string;
  scanId?: string;
  findingId?: string;
  limit?: number;
  offset?: number;
};

export type GuardianCheckOutput = {
  category: GuardianCheckCategory;
  checkKey: string;
  title: string;
  status: GuardianCheckResultStatus;
  severity: GuardianSeverity;
  message: string;
  latencyMs?: number | null;
  details?: Record<string, unknown>;
  findings?: Array<{
    code: string;
    title: string;
    description: string;
    severity: GuardianSeverity;
    evidence?: Record<string, unknown>;
    suggestion?: string | null;
    autoRepairable?: boolean;
    repair?: {
      action: GuardianRepairAction;
      title: string;
      description: string;
      oneClick: boolean;
      riskLevel: GuardianSeverity;
      steps: string[];
      metadata?: Record<string, unknown>;
    };
  }>;
};

export type GuardianTroubleshootResult = {
  summary: string;
  likelyCauses: string[];
  recommendedActions: string[];
  relatedFindingIds: string[];
  aiUsed: boolean;
  rawAiResponse: string | null;
};
