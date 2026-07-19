export const WHATSAPP_API_VERSION_DEFAULT = "v21.0";

export const WHATSAPP_MESSAGE_DIRECTIONS = ["inbound", "outbound"] as const;
export type WhatsAppMessageDirection =
  (typeof WHATSAPP_MESSAGE_DIRECTIONS)[number];

export const WHATSAPP_MESSAGE_TYPES = [
  "text",
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
  "contacts",
  "template",
  "interactive",
  "reaction",
  "unknown",
] as const;
export type WhatsAppMessageType = (typeof WHATSAPP_MESSAGE_TYPES)[number];

export const WHATSAPP_MESSAGE_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
  "received",
] as const;
export type WhatsAppMessageStatus = (typeof WHATSAPP_MESSAGE_STATUSES)[number];

export const WHATSAPP_CONVERSATION_STATUSES = [
  "open",
  "pending",
  "closed",
] as const;
export type WhatsAppConversationStatus =
  (typeof WHATSAPP_CONVERSATION_STATUSES)[number];

export const WHATSAPP_TEMPLATE_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAUSED",
  "DISABLED",
  "LOCAL",
] as const;
export type WhatsAppTemplateStatus = (typeof WHATSAPP_TEMPLATE_STATUSES)[number];

export const WHATSAPP_BROADCAST_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "completed",
  "failed",
  "cancelled",
] as const;
export type WhatsAppBroadcastStatus =
  (typeof WHATSAPP_BROADCAST_STATUSES)[number];

export const WHATSAPP_BROADCAST_RECIPIENT_STATUSES = [
  "pending",
  "sent",
  "failed",
  "skipped",
] as const;
export type WhatsAppBroadcastRecipientStatus =
  (typeof WHATSAPP_BROADCAST_RECIPIENT_STATUSES)[number];

export const WHATSAPP_LOG_STATUSES = ["success", "error"] as const;
export type WhatsAppLogStatus = (typeof WHATSAPP_LOG_STATUSES)[number];

export type WhatsAppSettings = {
  id: string;
  workspaceId: string;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  wabaId: string | null;
  accessToken: string | null;
  verifyToken: string | null;
  apiVersion: string;
  businessName: string | null;
  isConnected: boolean;
  crmSyncEnabled: boolean;
  chatbotEnabled: boolean;
  automationEnabled: boolean;
  defaultChatbotBotId: string | null;
  webhookPathSecret: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppContact = {
  id: string;
  workspaceId: string;
  waId: string;
  phone: string;
  profileName: string | null;
  crmContactId: string | null;
  crmLeadId: string | null;
  metadata: Record<string, unknown>;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppConversation = {
  id: string;
  workspaceId: string;
  contactId: string;
  waId: string;
  phone: string;
  status: WhatsAppConversationStatus;
  chatbotConversationId: string | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastMessageAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppMessage = {
  id: string;
  workspaceId: string;
  conversationId: string;
  contactId: string;
  direction: WhatsAppMessageDirection;
  type: WhatsAppMessageType;
  content: string | null;
  mediaId: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  templateName: string | null;
  templateLanguage: string | null;
  templateParams: string[];
  status: WhatsAppMessageStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  raw: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppTemplate = {
  id: string;
  workspaceId: string;
  name: string;
  language: string;
  category: string | null;
  status: WhatsAppTemplateStatus;
  body: string | null;
  components: unknown[];
  providerTemplateId: string | null;
  isLocal: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppMedia = {
  id: string;
  workspaceId: string;
  providerMediaId: string | null;
  mimeType: string | null;
  fileName: string | null;
  fileSize: number | null;
  sha256: string | null;
  localPath: string | null;
  sourceUrl: string | null;
  direction: WhatsAppMessageDirection;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppBroadcast = {
  id: string;
  workspaceId: string;
  name: string;
  templateName: string;
  templateLanguage: string;
  templateParams: string[];
  status: WhatsAppBroadcastStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdByUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppBroadcastRecipient = {
  id: string;
  broadcastId: string;
  workspaceId: string;
  contactId: string | null;
  phone: string;
  status: WhatsAppBroadcastRecipientStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppLog = {
  id: string;
  workspaceId: string;
  operation: string;
  status: WhatsAppLogStatus;
  direction: WhatsAppMessageDirection | null;
  phone: string | null;
  conversationId: string | null;
  messageId: string | null;
  providerMessageId: string | null;
  latencyMs: number | null;
  errorMessage: string | null;
  requestSummary: string | null;
  responseSummary: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type WhatsAppOverviewStats = {
  isConnected: boolean;
  contacts: number;
  conversations: number;
  messagesToday: number;
  templatesApproved: number;
  broadcastsActive: number;
  logsToday: number;
  crmSyncEnabled: boolean;
  chatbotEnabled: boolean;
  automationEnabled: boolean;
  displayPhoneNumber: string | null;
  businessName: string | null;
};

export type WhatsAppListFilters = {
  q?: string;
  status?: string;
  direction?: string;
  type?: string;
  conversationId?: string;
  contactId?: string;
  limit?: number;
  offset?: number;
};

export type WhatsAppCloudCredentials = {
  phoneNumberId: string;
  accessToken: string;
  wabaId?: string | null;
  apiVersion?: string;
};

export type WhatsAppSendTextInput = {
  to: string;
  text: string;
  previewUrl?: boolean;
};

export type WhatsAppSendTemplateInput = {
  to: string;
  templateName: string;
  language?: string;
  bodyParams?: string[];
};

export type WhatsAppSendMediaInput = {
  to: string;
  type: "image" | "audio" | "video" | "document";
  link?: string;
  mediaId?: string;
  caption?: string;
  filename?: string;
};

export type WhatsAppCloudSendResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  raw?: Record<string, unknown>;
};
