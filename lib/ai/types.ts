export const AI_PROVIDERS = ["openai", "gemini", "openrouter"] as const;
export type AiProviderId = (typeof AI_PROVIDERS)[number];

export const AI_PROMPT_KINDS = ["system", "workspace", "custom"] as const;
export type AiPromptKind = (typeof AI_PROMPT_KINDS)[number];

export const AI_MESSAGE_ROLES = [
  "system",
  "user",
  "assistant",
  "tool",
] as const;
export type AiMessageRole = (typeof AI_MESSAGE_ROLES)[number];

export const AI_CONVERSATION_STATUSES = ["active", "archived"] as const;
export type AiConversationStatus = (typeof AI_CONVERSATION_STATUSES)[number];

export const AI_LOG_STATUSES = ["success", "error"] as const;
export type AiLogStatus = (typeof AI_LOG_STATUSES)[number];

export type AiChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
};

export type AiToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type AiChatUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type AiChatResult = {
  content: string;
  provider: AiProviderId;
  model: string;
  usage?: AiChatUsage;
  toolCalls?: AiToolCall[];
};

export type AiStreamChunk =
  | { type: "delta"; text: string }
  | { type: "tool_calls"; toolCalls: AiToolCall[] }
  | {
      type: "done";
      content: string;
      model: string;
      usage?: AiChatUsage;
      toolCalls?: AiToolCall[];
    }
  | { type: "error"; message: string };

export type AiSettings = {
  id: string;
  workspaceId: string;
  defaultProvider: AiProviderId;
  defaultModel: string | null;
  temperature: number;
  streamingEnabled: boolean;
  toolsEnabled: boolean;
  systemPromptId: string | null;
  maxToolRounds: number;
  createdAt: string;
  updatedAt: string;
};

export type AiProviderCredential = {
  id: string;
  workspaceId: string;
  provider: AiProviderId;
  apiKey: string;
  baseUrl: string | null;
  defaultModel: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AiPrompt = {
  id: string;
  workspaceId: string;
  slug: string;
  name: string;
  kind: AiPromptKind;
  content: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AiConversation = {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  provider: AiProviderId | null;
  model: string | null;
  status: AiConversationStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AiMessage = {
  id: string;
  conversationId: string;
  workspaceId: string;
  role: AiMessageRole;
  content: string;
  toolName: string | null;
  toolCallId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AiLog = {
  id: string;
  workspaceId: string;
  conversationId: string | null;
  userId: string | null;
  provider: string;
  model: string;
  operation: string;
  status: AiLogStatus;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  credits: number;
  latencyMs: number | null;
  errorMessage: string | null;
  requestSummary: string | null;
  responseSummary: string | null;
  toolNames: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AiToolDefinition = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type AiToolResult = {
  ok: boolean;
  output: unknown;
  error?: string;
};

export type AiOverviewStats = {
  conversations: number;
  messages: number;
  prompts: number;
  activeProviders: number;
  logsToday: number;
  creditsUsedPeriod: number;
  successRate: number;
  defaultProvider: AiProviderId;
  defaultModel: string | null;
  toolsEnabled: boolean;
  streamingEnabled: boolean;
};

export type AiUsageSummary = {
  periodKey: string;
  requests: number;
  successCount: number;
  failureCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  credits: number;
  billingCredits: number;
  billingLimit: number;
  byProvider: Array<{
    provider: string;
    requests: number;
    tokens: number;
    credits: number;
  }>;
  byModel: Array<{ model: string; requests: number; tokens: number }>;
};

export type AiListFilters = {
  q?: string;
  kind?: string;
  status?: string;
  provider?: string;
  limit?: number;
  offset?: number;
};
