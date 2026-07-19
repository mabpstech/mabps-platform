export const EMAIL_PROVIDERS = ["smtp", "resend", "ses"] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

export const EMAIL_CONTACT_STATUSES = [
  "subscribed",
  "unsubscribed",
  "bounced",
  "complained",
] as const;
export type EmailContactStatus = (typeof EMAIL_CONTACT_STATUSES)[number];

export const EMAIL_TEMPLATE_CATEGORIES = [
  "transactional",
  "marketing",
] as const;
export type EmailTemplateCategory =
  (typeof EMAIL_TEMPLATE_CATEGORIES)[number];

export const EMAIL_TEMPLATE_STATUSES = ["active", "draft", "archived"] as const;
export type EmailTemplateStatus = (typeof EMAIL_TEMPLATE_STATUSES)[number];

export const EMAIL_MESSAGE_KINDS = ["transactional", "marketing"] as const;
export type EmailMessageKind = (typeof EMAIL_MESSAGE_KINDS)[number];

export const EMAIL_MESSAGE_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "failed",
  "complained",
] as const;
export type EmailMessageStatus = (typeof EMAIL_MESSAGE_STATUSES)[number];

export const EMAIL_CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "completed",
  "failed",
  "cancelled",
] as const;
export type EmailCampaignStatus = (typeof EMAIL_CAMPAIGN_STATUSES)[number];

export const EMAIL_CAMPAIGN_RECIPIENT_STATUSES = [
  "pending",
  "sent",
  "failed",
  "skipped",
  "bounced",
] as const;
export type EmailCampaignRecipientStatus =
  (typeof EMAIL_CAMPAIGN_RECIPIENT_STATUSES)[number];

export const EMAIL_LOG_STATUSES = ["success", "error"] as const;
export type EmailLogStatus = (typeof EMAIL_LOG_STATUSES)[number];

export const EMAIL_EVENT_TYPES = [
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "failed",
] as const;
export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[number];

export type EmailSettings = {
  id: string;
  workspaceId: string;
  provider: EmailProvider;
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassword: string | null;
  resendApiKey: string | null;
  sesAccessKeyId: string | null;
  sesSecretAccessKey: string | null;
  sesRegion: string;
  isConnected: boolean;
  crmSyncEnabled: boolean;
  automationEnabled: boolean;
  analyticsEnabled: boolean;
  openTrackingEnabled: boolean;
  clickTrackingEnabled: boolean;
  webhookPathSecret: string | null;
  trackingSecret: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailContact = {
  id: string;
  workspaceId: string;
  email: string;
  name: string | null;
  status: EmailContactStatus;
  crmContactId: string | null;
  crmLeadId: string | null;
  metadata: Record<string, unknown>;
  lastEmailAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailTemplate = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  category: EmailTemplateCategory;
  subject: string;
  html: string;
  text: string | null;
  variables: string[];
  status: EmailTemplateStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type EmailMessage = {
  id: string;
  workspaceId: string;
  contactId: string | null;
  templateId: string | null;
  campaignId: string | null;
  kind: EmailMessageKind;
  provider: EmailProvider | null;
  toEmail: string;
  toName: string | null;
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
  subject: string;
  html: string | null;
  text: string | null;
  status: EmailMessageStatus;
  providerMessageId: string | null;
  trackingToken: string | null;
  errorMessage: string | null;
  openCount: number;
  clickCount: number;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  raw: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type EmailCampaign = {
  id: string;
  workspaceId: string;
  name: string;
  templateId: string | null;
  subject: string;
  html: string | null;
  text: string | null;
  status: EmailCampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdByUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type EmailCampaignRecipient = {
  id: string;
  campaignId: string;
  workspaceId: string;
  contactId: string | null;
  email: string;
  name: string | null;
  messageId: string | null;
  status: EmailCampaignRecipientStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailLog = {
  id: string;
  workspaceId: string;
  operation: string;
  status: EmailLogStatus;
  provider: EmailProvider | null;
  email: string | null;
  messageId: string | null;
  campaignId: string | null;
  providerMessageId: string | null;
  latencyMs: number | null;
  errorMessage: string | null;
  requestSummary: string | null;
  responseSummary: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type EmailEvent = {
  id: string;
  workspaceId: string;
  messageId: string | null;
  campaignId: string | null;
  contactId: string | null;
  type: EmailEventType;
  email: string | null;
  url: string | null;
  providerMessageId: string | null;
  userAgent: string | null;
  ipHash: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

export type EmailOverviewStats = {
  isConnected: boolean;
  provider: EmailProvider;
  fromEmail: string | null;
  contacts: number;
  templates: number;
  messagesToday: number;
  campaignsActive: number;
  opensToday: number;
  clicksToday: number;
  bouncesToday: number;
  logsToday: number;
  crmSyncEnabled: boolean;
  automationEnabled: boolean;
  analyticsEnabled: boolean;
  openTrackingEnabled: boolean;
  clickTrackingEnabled: boolean;
};

export type EmailListFilters = {
  q?: string;
  status?: string;
  kind?: string;
  category?: string;
  campaignId?: string;
  contactId?: string;
  type?: string;
  limit?: number;
  offset?: number;
};

export type EmailSendInput = {
  to: string;
  toName?: string | null;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | null;
  kind?: EmailMessageKind;
  templateId?: string | null;
  campaignId?: string | null;
  variables?: Record<string, string>;
  metadata?: Record<string, unknown>;
};

export type EmailProviderSendResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  raw?: Record<string, unknown>;
};

export type EmailProviderCredentials =
  | {
      provider: "smtp";
      host: string;
      port: number;
      secure: boolean;
      user?: string | null;
      password?: string | null;
      fromEmail: string;
      fromName?: string | null;
    }
  | {
      provider: "resend";
      apiKey: string;
      fromEmail: string;
      fromName?: string | null;
    }
  | {
      provider: "ses";
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      fromEmail: string;
      fromName?: string | null;
    };
