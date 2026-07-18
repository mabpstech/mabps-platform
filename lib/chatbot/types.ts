export const AI_PROVIDERS = ["openai", "gemini", "openrouter"] as const;
export type AiProviderId = (typeof AI_PROVIDERS)[number];

export const BOT_STATUSES = ["draft", "active", "paused"] as const;
export type BotStatus = (typeof BOT_STATUSES)[number];

export const CHAT_CHANNELS = ["widget", "whatsapp", "api"] as const;
export type ChatChannel = (typeof CHAT_CHANNELS)[number];

export const CHANNEL_STATUSES = [
  "disabled",
  "ready",
  "connected",
  "error",
] as const;
export type ChannelStatus = (typeof CHANNEL_STATUSES)[number];

export const KNOWLEDGE_SOURCE_TYPES = [
  "pdf",
  "docx",
  "txt",
  "website",
] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export const KNOWLEDGE_SOURCE_STATUSES = [
  "pending",
  "processing",
  "ready",
  "error",
] as const;
export type KnowledgeSourceStatus = (typeof KNOWLEDGE_SOURCE_STATUSES)[number];

export const CONVERSATION_STATUSES = [
  "ai",
  "handoff_requested",
  "human",
  "closed",
] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const MESSAGE_ROLES = [
  "user",
  "assistant",
  "human_agent",
  "system",
] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const HANDOFF_STATUSES = [
  "requested",
  "claimed",
  "resolved",
  "cancelled",
] as const;
export type HandoffStatus = (typeof HANDOFF_STATUSES)[number];

export const WIDGET_POSITIONS = [
  "bottom-right",
  "bottom-left",
] as const;
export type WidgetPosition = (typeof WIDGET_POSITIONS)[number];

export type ChatbotBot = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  systemPrompt: string;
  welcomeMessage: string;
  fallbackMessage: string;
  provider: AiProviderId;
  model: string | null;
  temperature: number;
  status: BotStatus;
  leadCaptureEnabled: boolean;
  handoffEnabled: boolean;
  memoryEnabled: boolean;
  publicKey: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotProviderCredential = {
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

export type ChatbotProviderCredentialPublic = Omit<
  ChatbotProviderCredential,
  "apiKey"
> & {
  hasApiKey: boolean;
  apiKeyLast4: string | null;
};

export type ChatbotWidget = {
  id: string;
  botId: string;
  workspaceId: string;
  title: string;
  primaryColor: string;
  position: WidgetPosition;
  launcherLabel: string;
  allowedOrigins: string[] | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotChannel = {
  id: string;
  botId: string;
  workspaceId: string;
  channel: ChatChannel;
  status: ChannelStatus;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotKnowledgeSource = {
  id: string;
  botId: string;
  workspaceId: string;
  type: KnowledgeSourceType;
  title: string;
  status: KnowledgeSourceStatus;
  sourceUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  storagePath: string | null;
  byteSize: number;
  errorMessage: string | null;
  chunkCount: number;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotKnowledgeChunk = {
  id: string;
  sourceId: string;
  botId: string;
  workspaceId: string;
  chunkIndex: number;
  content: string;
  tokenEstimate: number;
  createdAt: string;
};

export type ChatbotConversation = {
  id: string;
  botId: string;
  workspaceId: string;
  channel: ChatChannel;
  status: ConversationStatus;
  visitorId: string | null;
  visitorName: string | null;
  visitorEmail: string | null;
  visitorPhone: string | null;
  externalThreadId: string | null;
  crmLeadId: string | null;
  assignedUserId: string | null;
  handoffReason: string | null;
  metadata: Record<string, unknown>;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotMessage = {
  id: string;
  conversationId: string;
  botId: string;
  workspaceId: string;
  role: MessageRole;
  content: string;
  channel: ChatChannel;
  provider: AiProviderId | null;
  model: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ChatbotMemory = {
  id: string;
  botId: string;
  workspaceId: string;
  visitorKey: string;
  key: string;
  value: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotHandoff = {
  id: string;
  conversationId: string;
  botId: string;
  workspaceId: string;
  status: HandoffStatus;
  reason: string | null;
  requestedAt: string;
  claimedByUserId: string | null;
  claimedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotOverviewStats = {
  bots: number;
  activeBots: number;
  knowledgeSources: number;
  readySources: number;
  conversations: number;
  openHandoffs: number;
  leadsCaptured: number;
  messagesToday: number;
};

export type ChatbotListFilters = {
  q?: string;
  status?: string;
  channel?: string;
  botId?: string;
  limit?: number;
  offset?: number;
};

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiChatResult = {
  content: string;
  provider: AiProviderId;
  model: string;
};

export type ChannelOutboundMessage = {
  conversationId: string;
  externalThreadId?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
};
