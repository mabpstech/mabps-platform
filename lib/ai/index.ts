export * from "@/lib/ai/types";
export {
  DEFAULT_AI_MODEL,
  AI_MODEL_OPTIONS,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_WORKSPACE_PROMPT,
  slugifyPromptName,
  estimateCredits,
  currentPeriodKey,
  maskApiKey,
} from "@/lib/ai/defaults";
export { migrateAiSchema } from "@/lib/ai/migrate";
export type { AiProviderCredentialPublic } from "@/lib/ai/repository";
export {
  ensureAiReady,
  ensureWorkspaceAi,
  getAiSettings,
  updateAiSettings,
  listProviderCredentials,
  getProviderCredential,
  resolveProviderCredential,
  upsertProviderCredential,
  deleteProviderCredential,
  listPrompts,
  getPromptById,
  createPrompt,
  updatePrompt,
  deletePrompt,
  resolveActivePrompts,
  listConversations,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
  listMessages,
  createMessage,
  createAiLog,
  listAiLogs,
  getAiUsageSummary,
  getAiOverview,
} from "@/lib/ai/repository";
export { getAiProvider, runAiChat, streamAiChat } from "@/lib/ai/providers";
export { listAiTools, executeAiTool, getAiTool } from "@/lib/ai/tools";
export {
  handleAssistantMessage,
  streamAssistantMessage,
} from "@/lib/ai/engine/chat";
export { buildAssistantSystemMessages } from "@/lib/ai/engine/prompts";
export {
  assertAiCreditsAvailable,
  recordAssistantUsage,
} from "@/lib/ai/engine/usage";
