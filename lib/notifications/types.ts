export const NOTIFICATION_CHANNELS = [
  "in_app",
  "push",
  "email",
  "whatsapp",
  "browser",
] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_CATEGORIES = [
  "system",
  "crm",
  "billing",
  "automation",
  "ai",
  "marketing",
  "custom",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_STATUSES = [
  "pending",
  "delivered",
  "failed",
  "read",
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const NOTIFICATION_DELIVERY_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "failed",
  "skipped",
] as const;
export type NotificationDeliveryStatus =
  (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export const NOTIFICATION_TEMPLATE_STATUSES = [
  "active",
  "draft",
  "archived",
] as const;
export type NotificationTemplateStatus =
  (typeof NOTIFICATION_TEMPLATE_STATUSES)[number];

export const NOTIFICATION_LOG_STATUSES = ["success", "error"] as const;
export type NotificationLogStatus = (typeof NOTIFICATION_LOG_STATUSES)[number];

export const NOTIFICATION_EVENT_TYPES = [
  "created",
  "delivered",
  "read",
  "failed",
  "preference_updated",
  "subscription_updated",
] as const;
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export type NotificationSettings = {
  id: string;
  workspaceId: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  browserEnabled: boolean;
  defaultChannels: NotificationChannel[];
  defaultPriority: NotificationPriority;
  crmSyncEnabled: boolean;
  automationEnabled: boolean;
  analyticsEnabled: boolean;
  vapidPublicKey: string | null;
  vapidPrivateKey: string | null;
  pushEndpoint: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationPreference = {
  id: string;
  workspaceId: string;
  userId: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  browserEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  categoryOverrides: Record<string, NotificationChannel[]>;
  emailAddress: string | null;
  phoneNumber: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationTemplate = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  category: NotificationCategory;
  title: string;
  body: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  variables: string[];
  status: NotificationTemplateStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AppNotification = {
  id: string;
  workspaceId: string;
  userId: string | null;
  templateId: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  href: string | null;
  status: NotificationStatus;
  channels: NotificationChannel[];
  crmEntityType: string | null;
  crmEntityId: string | null;
  isRead: boolean;
  readAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationDelivery = {
  id: string;
  notificationId: string;
  workspaceId: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  latencyMs: number | null;
  raw: Record<string, unknown>;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationSubscription = {
  id: string;
  workspaceId: string;
  userId: string;
  channel: "push" | "browser";
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
  userAgent: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type NotificationLog = {
  id: string;
  workspaceId: string;
  operation: string;
  status: NotificationLogStatus;
  channel: NotificationChannel | null;
  notificationId: string | null;
  userId: string | null;
  latencyMs: number | null;
  errorMessage: string | null;
  requestSummary: string | null;
  responseSummary: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type NotificationEvent = {
  id: string;
  workspaceId: string;
  notificationId: string | null;
  userId: string | null;
  type: NotificationEventType;
  channel: NotificationChannel | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

export type NotificationOverviewStats = {
  total: number;
  unread: number;
  deliveredToday: number;
  failedToday: number;
  templates: number;
  subscriptions: number;
  logsToday: number;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  browserEnabled: boolean;
  crmSyncEnabled: boolean;
  automationEnabled: boolean;
  analyticsEnabled: boolean;
};

export type NotificationListFilters = {
  q?: string;
  status?: string;
  priority?: string;
  category?: string;
  channel?: string;
  userId?: string;
  type?: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
};

export type NotificationSendInput = {
  userId?: string | null;
  title: string;
  body: string;
  href?: string | null;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  templateId?: string | null;
  variables?: Record<string, string>;
  email?: string | null;
  phone?: string | null;
  crmEntityType?: string | null;
  crmEntityId?: string | null;
  metadata?: Record<string, unknown>;
  createdByUserId?: string | null;
};

export type NotificationChannelResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  skipped?: boolean;
  raw?: Record<string, unknown>;
};
