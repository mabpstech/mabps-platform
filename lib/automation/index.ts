export * from "@/lib/automation/types";
export { migrateAutomationSchema } from "@/lib/automation/migrate";
export {
  ensureAutomationReady,
  getAutomationOverview,
  listWorkflows,
  getWorkflowById,
  getWorkflowByWebhookSecret,
  getWorkflowByApiKey,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  listRuns,
  getRunById,
  createRun,
  listRunSteps,
  listRunLogs,
  getScheduleByWorkflowId,
  listActiveWorkflowsByTrigger,
  countActiveWorkflows,
} from "@/lib/automation/repository";
export {
  emitAutomationEvent,
  emitWebsiteEvent,
  emitCrmEvent,
  emitChatbotEvent,
  emitWhatsAppEvent,
  emitEmailEvent,
  emitNotificationEvent,
} from "@/lib/automation/events";
export { processAutomationQueue, executeRun } from "@/lib/automation/engine/runner";
export { tickAutomationEngine } from "@/lib/automation/engine/scheduler";
export { getAction, listActionTypes } from "@/lib/automation/actions";
export { getWhatsAppProvider } from "@/lib/automation/providers/whatsapp";
export { getEmailProvider } from "@/lib/automation/providers/email";
export { getNotificationProvider } from "@/lib/automation/providers/notifications";
export { TRIGGER_LABELS, defaultWorkflowDefinition } from "@/lib/automation/defaults";
