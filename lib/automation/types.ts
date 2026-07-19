export const WORKFLOW_STATUSES = ["draft", "active", "paused", "archived"] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const TRIGGER_TYPES = [
  "manual",
  "schedule",
  "webhook",
  "api",
  "website.form_submitted",
  "website.page_published",
  "crm.lead_created",
  "crm.lead_updated",
  "crm.deal_stage_changed",
  "crm.contact_created",
  "crm.task_created",
  "chatbot.conversation_started",
  "chatbot.message_received",
  "chatbot.handoff_requested",
  "chatbot.lead_captured",
  "whatsapp.conversation_started",
  "whatsapp.message_received",
  "email.sent",
  "email.opened",
  "email.clicked",
  "email.bounced",
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const NODE_KINDS = [
  "trigger",
  "condition",
  "action",
  "delay",
  "wait",
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const ACTION_TYPES = [
  "email.send",
  "whatsapp.send",
  "webhook.http_request",
  "crm.create_lead",
  "crm.update_lead",
  "crm.create_task",
  "crm.create_activity",
  "crm.create_deal",
  "chatbot.send_message",
  "knowledge.search",
  "memory.remember",
  "memory.search",
  "memory.merge",
  "set_variable",
  "log",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const CONDITION_OPERATORS = [
  "eq",
  "neq",
  "contains",
  "not_contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "exists",
  "not_exists",
  "in",
  "not_in",
] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export const RUN_STATUSES = [
  "queued",
  "running",
  "waiting",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const RUN_STEP_STATUSES = [
  "pending",
  "running",
  "waiting",
  "succeeded",
  "failed",
  "skipped",
] as const;
export type RunStepStatus = (typeof RUN_STEP_STATUSES)[number];

export const QUEUE_JOB_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;
export type QueueJobStatus = (typeof QUEUE_JOB_STATUSES)[number];

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export type ConditionRule = {
  path: string;
  operator: ConditionOperator;
  value?: unknown;
};

export type ConditionGroup = {
  logic: "and" | "or";
  rules: ConditionRule[];
};

export type WorkflowNodeBase = {
  id: string;
  name: string;
  kind: NodeKind;
};

export type TriggerNode = WorkflowNodeBase & {
  kind: "trigger";
  type: TriggerType;
  config: Record<string, unknown>;
};

export type ConditionNode = WorkflowNodeBase & {
  kind: "condition";
  type: "condition";
  config: ConditionGroup;
};

export type ActionNode = WorkflowNodeBase & {
  kind: "action";
  type: ActionType;
  config: Record<string, unknown>;
};

export type DelayNode = WorkflowNodeBase & {
  kind: "delay";
  type: "delay";
  config: {
    /** Delay duration in seconds. */
    seconds?: number;
    minutes?: number;
    hours?: number;
  };
};

export type WaitNode = WorkflowNodeBase & {
  kind: "wait";
  type: "wait";
  config: {
    /** Absolute ISO timestamp, or template that resolves to one. */
    until?: string;
    /** Optional event name to resume on (future-ready). */
    event?: string;
  };
};

export type WorkflowNode =
  | TriggerNode
  | ConditionNode
  | ActionNode
  | DelayNode
  | WaitNode;

export type WorkflowDefinition = WorkflowNode[];

export type AutomationWorkflow = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  status: WorkflowStatus;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  definition: WorkflowDefinition;
  webhookSecret: string | null;
  apiKey: string | null;
  version: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomationRun = {
  id: string;
  workspaceId: string;
  workflowId: string;
  status: RunStatus;
  triggerType: TriggerType;
  triggerPayload: Record<string, unknown>;
  context: Record<string, unknown>;
  currentNodeId: string | null;
  attempt: number;
  maxAttempts: number;
  errorMessage: string | null;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomationRunStep = {
  id: string;
  runId: string;
  workspaceId: string;
  workflowId: string;
  nodeId: string;
  nodeType: string;
  nodeKind: NodeKind;
  status: RunStepStatus;
  attempt: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomationRunLog = {
  id: string;
  runId: string;
  workspaceId: string;
  workflowId: string;
  runStepId: string | null;
  level: LogLevel;
  message: string;
  data: Record<string, unknown>;
  createdAt: string;
};

export type AutomationQueueJob = {
  id: string;
  workspaceId: string;
  workflowId: string;
  runId: string;
  jobType: string;
  status: QueueJobStatus;
  priority: number;
  attempt: number;
  maxAttempts: number;
  availableAt: string;
  lockedAt: string | null;
  lockedBy: string | null;
  payload: Record<string, unknown>;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomationSchedule = {
  id: string;
  workspaceId: string;
  workflowId: string;
  cronExpression: string;
  timezone: string;
  isEnabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomationOverview = {
  workflows: number;
  activeWorkflows: number;
  runsTotal: number;
  runsSucceeded: number;
  runsFailed: number;
  runsQueued: number;
  queuePending: number;
};

export type PlatformEvent = {
  type: TriggerType;
  workspaceId: string;
  payload: Record<string, unknown>;
  occurredAt?: string;
};

export type ActionResult = {
  ok: boolean;
  output?: Record<string, unknown>;
  error?: string;
  /** When set, runner should pause until this ISO time. */
  waitUntil?: string;
};

export type TemplateContext = {
  trigger: Record<string, unknown>;
  vars: Record<string, unknown>;
  steps: Record<string, unknown>;
  workflow: {
    id: string;
    name: string;
    workspaceId: string;
  };
  run: {
    id: string;
    attempt: number;
  };
};
