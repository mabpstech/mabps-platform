import { randomUUID } from "node:crypto";
import {
  DEFAULT_NOTIFICATION_CATEGORY,
  DEFAULT_NOTIFICATION_CHANNELS,
  DEFAULT_NOTIFICATION_PRIORITY,
  DEFAULT_TIMEZONE,
  generateVapidKeys,
  maskSecret,
  slugify,
} from "@/lib/notifications/defaults";
import { migrateNotificationsSchema } from "@/lib/notifications/migrate";
import type {
  AppNotification,
  NotificationCategory,
  NotificationChannel,
  NotificationDelivery,
  NotificationDeliveryStatus,
  NotificationEvent,
  NotificationEventType,
  NotificationListFilters,
  NotificationLog,
  NotificationLogStatus,
  NotificationOverviewStats,
  NotificationPreference,
  NotificationPriority,
  NotificationSettings,
  NotificationStatus,
  NotificationSubscription,
  NotificationTemplate,
  NotificationTemplateStatus,
} from "@/lib/notifications/types";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_DELIVERY_STATUSES,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_LOG_STATUSES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TEMPLATE_STATUSES,
} from "@/lib/notifications/types";
import { sqlite } from "@/lib/db";

function nowIso(): string {
  return new Date().toISOString();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function likePattern(q: string): string {
  return `%${q.replace(/[%_]/g, (ch) => `\\${ch}`)}%`;
}

function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function parseChannels(value: unknown): NotificationChannel[] {
  const parsed = parseJson<string[]>(value, DEFAULT_NOTIFICATION_CHANNELS);
  const channels = parsed.filter((item): item is NotificationChannel =>
    NOTIFICATION_CHANNELS.includes(item as NotificationChannel),
  );
  return channels.length ? channels : [...DEFAULT_NOTIFICATION_CHANNELS];
}

function parsePriority(value: unknown): NotificationPriority {
  const priority = String(value || DEFAULT_NOTIFICATION_PRIORITY);
  return NOTIFICATION_PRIORITIES.includes(priority as NotificationPriority)
    ? (priority as NotificationPriority)
    : DEFAULT_NOTIFICATION_PRIORITY;
}

function parseCategory(value: unknown): NotificationCategory {
  const category = String(value || DEFAULT_NOTIFICATION_CATEGORY);
  return NOTIFICATION_CATEGORIES.includes(category as NotificationCategory)
    ? (category as NotificationCategory)
    : DEFAULT_NOTIFICATION_CATEGORY;
}

export function ensureNotificationsReady(): void {
  migrateNotificationsSchema();
}

function rowToSettings(row: Record<string, unknown>): NotificationSettings {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    inAppEnabled: Boolean(row.inAppEnabled),
    pushEnabled: Boolean(row.pushEnabled),
    emailEnabled: Boolean(row.emailEnabled),
    whatsappEnabled: Boolean(row.whatsappEnabled),
    browserEnabled: Boolean(row.browserEnabled),
    defaultChannels: parseChannels(row.defaultChannelsJson),
    defaultPriority: parsePriority(row.defaultPriority),
    crmSyncEnabled: Boolean(row.crmSyncEnabled),
    automationEnabled: Boolean(row.automationEnabled),
    analyticsEnabled: Boolean(row.analyticsEnabled),
    vapidPublicKey: (row.vapidPublicKey as string | null) ?? null,
    vapidPrivateKey: (row.vapidPrivateKey as string | null) ?? null,
    pushEndpoint: (row.pushEndpoint as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export type NotificationSettingsPublic = Omit<
  NotificationSettings,
  "vapidPrivateKey"
> & {
  vapidPrivateKeyMasked: string;
  hasVapidPrivateKey: boolean;
};

export function toPublicSettings(
  settings: NotificationSettings,
): NotificationSettingsPublic {
  const { vapidPrivateKey, ...rest } = settings;
  return {
    ...rest,
    vapidPrivateKeyMasked: maskSecret(vapidPrivateKey),
    hasVapidPrivateKey: Boolean(vapidPrivateKey),
  };
}

function rowToPreference(row: Record<string, unknown>): NotificationPreference {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    userId: String(row.userId),
    inAppEnabled: Boolean(row.inAppEnabled),
    pushEnabled: Boolean(row.pushEnabled),
    emailEnabled: Boolean(row.emailEnabled),
    whatsappEnabled: Boolean(row.whatsappEnabled),
    browserEnabled: Boolean(row.browserEnabled),
    quietHoursStart: (row.quietHoursStart as string | null) ?? null,
    quietHoursEnd: (row.quietHoursEnd as string | null) ?? null,
    timezone: String(row.timezone || DEFAULT_TIMEZONE),
    categoryOverrides: parseJson(row.categoryOverridesJson, {}),
    emailAddress: (row.emailAddress as string | null) ?? null,
    phoneNumber: (row.phoneNumber as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToTemplate(row: Record<string, unknown>): NotificationTemplate {
  const status = String(row.status || "active");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    slug: String(row.slug),
    category: parseCategory(row.category),
    title: String(row.title),
    body: String(row.body),
    channels: parseChannels(row.channelsJson),
    priority: parsePriority(row.priority),
    variables: parseJson(row.variablesJson, [] as string[]),
    status: NOTIFICATION_TEMPLATE_STATUSES.includes(
      status as NotificationTemplateStatus,
    )
      ? (status as NotificationTemplateStatus)
      : "active",
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToNotification(row: Record<string, unknown>): AppNotification {
  const status = String(row.status || "pending");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    userId: (row.userId as string | null) ?? null,
    templateId: (row.templateId as string | null) ?? null,
    category: parseCategory(row.category),
    priority: parsePriority(row.priority),
    title: String(row.title),
    body: String(row.body),
    href: (row.href as string | null) ?? null,
    status: NOTIFICATION_STATUSES.includes(status as NotificationStatus)
      ? (status as NotificationStatus)
      : "pending",
    channels: parseChannels(row.channelsJson),
    crmEntityType: (row.crmEntityType as string | null) ?? null,
    crmEntityId: (row.crmEntityId as string | null) ?? null,
    isRead: Boolean(row.isRead),
    readAt: (row.readAt as string | null) ?? null,
    deliveredAt: (row.deliveredAt as string | null) ?? null,
    failedAt: (row.failedAt as string | null) ?? null,
    errorMessage: (row.errorMessage as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    createdByUserId: (row.createdByUserId as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToDelivery(row: Record<string, unknown>): NotificationDelivery {
  const status = String(row.status || "queued");
  const channel = String(row.channel || "in_app");
  return {
    id: String(row.id),
    notificationId: String(row.notificationId),
    workspaceId: String(row.workspaceId),
    channel: NOTIFICATION_CHANNELS.includes(channel as NotificationChannel)
      ? (channel as NotificationChannel)
      : "in_app",
    status: NOTIFICATION_DELIVERY_STATUSES.includes(
      status as NotificationDeliveryStatus,
    )
      ? (status as NotificationDeliveryStatus)
      : "queued",
    providerMessageId: (row.providerMessageId as string | null) ?? null,
    errorMessage: (row.errorMessage as string | null) ?? null,
    latencyMs:
      row.latencyMs === null || row.latencyMs === undefined
        ? null
        : Number(row.latencyMs),
    raw: parseJson(row.rawJson, {}),
    sentAt: (row.sentAt as string | null) ?? null,
    deliveredAt: (row.deliveredAt as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToSubscription(
  row: Record<string, unknown>,
): NotificationSubscription {
  const channel = String(row.channel || "browser");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    userId: String(row.userId),
    channel: channel === "push" ? "push" : "browser",
    endpoint: String(row.endpoint),
    p256dh: (row.p256dh as string | null) ?? null,
    auth: (row.auth as string | null) ?? null,
    userAgent: (row.userAgent as string | null) ?? null,
    isActive: Boolean(row.isActive),
    lastUsedAt: (row.lastUsedAt as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToLog(row: Record<string, unknown>): NotificationLog {
  const status = String(row.status || "success");
  const channel = row.channel ? String(row.channel) : null;
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    operation: String(row.operation),
    status: NOTIFICATION_LOG_STATUSES.includes(status as NotificationLogStatus)
      ? (status as NotificationLogStatus)
      : "success",
    channel:
      channel && NOTIFICATION_CHANNELS.includes(channel as NotificationChannel)
        ? (channel as NotificationChannel)
        : null,
    notificationId: (row.notificationId as string | null) ?? null,
    userId: (row.userId as string | null) ?? null,
    latencyMs:
      row.latencyMs === null || row.latencyMs === undefined
        ? null
        : Number(row.latencyMs),
    errorMessage: (row.errorMessage as string | null) ?? null,
    requestSummary: (row.requestSummary as string | null) ?? null,
    responseSummary: (row.responseSummary as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
  };
}

function rowToEvent(row: Record<string, unknown>): NotificationEvent {
  const type = String(row.type || "created");
  const channel = row.channel ? String(row.channel) : null;
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    notificationId: (row.notificationId as string | null) ?? null,
    userId: (row.userId as string | null) ?? null,
    type: NOTIFICATION_EVENT_TYPES.includes(type as NotificationEventType)
      ? (type as NotificationEventType)
      : "created",
    channel:
      channel && NOTIFICATION_CHANNELS.includes(channel as NotificationChannel)
        ? (channel as NotificationChannel)
        : null,
    metadata: parseJson(row.metadataJson, {}),
    occurredAt: String(row.occurredAt),
    createdAt: String(row.createdAt),
  };
}

export function getNotificationSettings(
  workspaceId: string,
): NotificationSettings | null {
  ensureNotificationsReady();
  const row = sqlite
    .prepare(`SELECT * FROM "notification_settings" WHERE "workspaceId" = ?`)
    .get(workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToSettings(row) : null;
}

export function ensureWorkspaceNotifications(
  workspaceId: string,
): NotificationSettings {
  ensureNotificationsReady();
  const existing = getNotificationSettings(workspaceId);
  if (existing) return existing;

  const id = randomUUID();
  const timestamp = nowIso();
  const vapid = generateVapidKeys();
  sqlite
    .prepare(
      `INSERT INTO "notification_settings" (
        "id", "workspaceId", "inAppEnabled", "pushEnabled", "emailEnabled",
        "whatsappEnabled", "browserEnabled", "defaultChannelsJson",
        "defaultPriority", "crmSyncEnabled", "automationEnabled",
        "analyticsEnabled", "vapidPublicKey", "vapidPrivateKey",
        "pushEndpoint", "createdAt", "updatedAt"
      ) VALUES (?, ?, 1, 1, 1, 1, 1, ?, ?, 1, 1, 1, ?, ?, NULL, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      JSON.stringify(DEFAULT_NOTIFICATION_CHANNELS),
      DEFAULT_NOTIFICATION_PRIORITY,
      vapid.publicKey,
      vapid.privateKey,
      timestamp,
      timestamp,
    );
  return getNotificationSettings(workspaceId)!;
}

export function updateNotificationSettings(
  workspaceId: string,
  input: Partial<{
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
    pushEndpoint: string | null;
    regenerateVapidKeys: boolean;
  }>,
): NotificationSettings {
  const existing = ensureWorkspaceNotifications(workspaceId);
  const timestamp = nowIso();
  const vapid = input.regenerateVapidKeys ? generateVapidKeys() : null;

  const next: NotificationSettings = {
    ...existing,
    inAppEnabled:
      input.inAppEnabled !== undefined
        ? input.inAppEnabled
        : existing.inAppEnabled,
    pushEnabled:
      input.pushEnabled !== undefined ? input.pushEnabled : existing.pushEnabled,
    emailEnabled:
      input.emailEnabled !== undefined
        ? input.emailEnabled
        : existing.emailEnabled,
    whatsappEnabled:
      input.whatsappEnabled !== undefined
        ? input.whatsappEnabled
        : existing.whatsappEnabled,
    browserEnabled:
      input.browserEnabled !== undefined
        ? input.browserEnabled
        : existing.browserEnabled,
    defaultChannels: input.defaultChannels ?? existing.defaultChannels,
    defaultPriority: input.defaultPriority ?? existing.defaultPriority,
    crmSyncEnabled:
      input.crmSyncEnabled !== undefined
        ? input.crmSyncEnabled
        : existing.crmSyncEnabled,
    automationEnabled:
      input.automationEnabled !== undefined
        ? input.automationEnabled
        : existing.automationEnabled,
    analyticsEnabled:
      input.analyticsEnabled !== undefined
        ? input.analyticsEnabled
        : existing.analyticsEnabled,
    pushEndpoint:
      input.pushEndpoint !== undefined
        ? asStringOrNull(input.pushEndpoint)
        : existing.pushEndpoint,
    vapidPublicKey: vapid?.publicKey ?? existing.vapidPublicKey,
    vapidPrivateKey: vapid?.privateKey ?? existing.vapidPrivateKey,
    updatedAt: timestamp,
  };

  sqlite
    .prepare(
      `UPDATE "notification_settings" SET
        "inAppEnabled" = ?, "pushEnabled" = ?, "emailEnabled" = ?,
        "whatsappEnabled" = ?, "browserEnabled" = ?, "defaultChannelsJson" = ?,
        "defaultPriority" = ?, "crmSyncEnabled" = ?, "automationEnabled" = ?,
        "analyticsEnabled" = ?, "vapidPublicKey" = ?, "vapidPrivateKey" = ?,
        "pushEndpoint" = ?, "updatedAt" = ?
      WHERE "workspaceId" = ?`,
    )
    .run(
      next.inAppEnabled ? 1 : 0,
      next.pushEnabled ? 1 : 0,
      next.emailEnabled ? 1 : 0,
      next.whatsappEnabled ? 1 : 0,
      next.browserEnabled ? 1 : 0,
      JSON.stringify(next.defaultChannels),
      next.defaultPriority,
      next.crmSyncEnabled ? 1 : 0,
      next.automationEnabled ? 1 : 0,
      next.analyticsEnabled ? 1 : 0,
      next.vapidPublicKey,
      next.vapidPrivateKey,
      next.pushEndpoint,
      timestamp,
      workspaceId,
    );

  return getNotificationSettings(workspaceId)!;
}

export function getPreference(
  workspaceId: string,
  userId: string,
): NotificationPreference | null {
  ensureNotificationsReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "notification_preference"
       WHERE "workspaceId" = ? AND "userId" = ?`,
    )
    .get(workspaceId, userId) as Record<string, unknown> | undefined;
  return row ? rowToPreference(row) : null;
}

export function ensurePreference(
  workspaceId: string,
  userId: string,
): NotificationPreference {
  ensureNotificationsReady();
  const existing = getPreference(workspaceId, userId);
  if (existing) return existing;

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "notification_preference" (
        "id", "workspaceId", "userId", "inAppEnabled", "pushEnabled",
        "emailEnabled", "whatsappEnabled", "browserEnabled",
        "quietHoursStart", "quietHoursEnd", "timezone",
        "categoryOverridesJson", "emailAddress", "phoneNumber",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, 1, 1, 1, 0, 1, NULL, NULL, ?, '{}', NULL, NULL, ?, ?)`,
    )
    .run(id, workspaceId, userId, DEFAULT_TIMEZONE, timestamp, timestamp);
  return getPreference(workspaceId, userId)!;
}

export function updatePreference(
  workspaceId: string,
  userId: string,
  input: Partial<{
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
  }>,
): NotificationPreference {
  const existing = ensurePreference(workspaceId, userId);
  const timestamp = nowIso();
  const next: NotificationPreference = {
    ...existing,
    inAppEnabled:
      input.inAppEnabled !== undefined
        ? input.inAppEnabled
        : existing.inAppEnabled,
    pushEnabled:
      input.pushEnabled !== undefined ? input.pushEnabled : existing.pushEnabled,
    emailEnabled:
      input.emailEnabled !== undefined
        ? input.emailEnabled
        : existing.emailEnabled,
    whatsappEnabled:
      input.whatsappEnabled !== undefined
        ? input.whatsappEnabled
        : existing.whatsappEnabled,
    browserEnabled:
      input.browserEnabled !== undefined
        ? input.browserEnabled
        : existing.browserEnabled,
    quietHoursStart:
      input.quietHoursStart !== undefined
        ? asStringOrNull(input.quietHoursStart)
        : existing.quietHoursStart,
    quietHoursEnd:
      input.quietHoursEnd !== undefined
        ? asStringOrNull(input.quietHoursEnd)
        : existing.quietHoursEnd,
    timezone: input.timezone?.trim() || existing.timezone,
    categoryOverrides: input.categoryOverrides ?? existing.categoryOverrides,
    emailAddress:
      input.emailAddress !== undefined
        ? asStringOrNull(input.emailAddress)
        : existing.emailAddress,
    phoneNumber:
      input.phoneNumber !== undefined
        ? asStringOrNull(input.phoneNumber)
        : existing.phoneNumber,
    updatedAt: timestamp,
  };

  sqlite
    .prepare(
      `UPDATE "notification_preference" SET
        "inAppEnabled" = ?, "pushEnabled" = ?, "emailEnabled" = ?,
        "whatsappEnabled" = ?, "browserEnabled" = ?, "quietHoursStart" = ?,
        "quietHoursEnd" = ?, "timezone" = ?, "categoryOverridesJson" = ?,
        "emailAddress" = ?, "phoneNumber" = ?, "updatedAt" = ?
      WHERE "workspaceId" = ? AND "userId" = ?`,
    )
    .run(
      next.inAppEnabled ? 1 : 0,
      next.pushEnabled ? 1 : 0,
      next.emailEnabled ? 1 : 0,
      next.whatsappEnabled ? 1 : 0,
      next.browserEnabled ? 1 : 0,
      next.quietHoursStart,
      next.quietHoursEnd,
      next.timezone,
      JSON.stringify(next.categoryOverrides),
      next.emailAddress,
      next.phoneNumber,
      timestamp,
      workspaceId,
      userId,
    );

  return getPreference(workspaceId, userId)!;
}

export function listTemplates(
  workspaceId: string,
  filters: NotificationListFilters = {},
): NotificationTemplate[] {
  ensureNotificationsReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.q) {
    clauses.push(
      `("name" LIKE ? ESCAPE '\\' OR "slug" LIKE ? ESCAPE '\\' OR "title" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern);
  }
  if (filters.category) {
    clauses.push(`"category" = ?`);
    params.push(filters.category);
  }
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "notification_template"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "updatedAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToTemplate);
}

export function getTemplateById(
  workspaceId: string,
  templateId: string,
): NotificationTemplate | null {
  ensureNotificationsReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "notification_template"
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(templateId, workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToTemplate(row) : null;
}

export function getTemplateBySlug(
  workspaceId: string,
  slug: string,
): NotificationTemplate | null {
  ensureNotificationsReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "notification_template"
       WHERE "workspaceId" = ? AND "slug" = ?`,
    )
    .get(workspaceId, slug) as Record<string, unknown> | undefined;
  return row ? rowToTemplate(row) : null;
}

export function createTemplate(input: {
  workspaceId: string;
  name: string;
  slug?: string;
  category?: NotificationCategory;
  title: string;
  body: string;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  variables?: string[];
  status?: NotificationTemplateStatus;
  metadata?: Record<string, unknown>;
}): NotificationTemplate {
  ensureNotificationsReady();
  const id = randomUUID();
  const timestamp = nowIso();
  const baseSlug = slugify(input.slug || input.name) || `template-${id.slice(0, 8)}`;
  let slug = baseSlug;
  let attempt = 1;
  while (getTemplateBySlug(input.workspaceId, slug)) {
    slug = `${baseSlug}-${attempt++}`;
  }

  sqlite
    .prepare(
      `INSERT INTO "notification_template" (
        "id", "workspaceId", "name", "slug", "category", "title", "body",
        "channelsJson", "priority", "variablesJson", "status", "metadataJson",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.name.trim(),
      slug,
      input.category || DEFAULT_NOTIFICATION_CATEGORY,
      input.title.trim(),
      input.body.trim(),
      JSON.stringify(input.channels || DEFAULT_NOTIFICATION_CHANNELS),
      input.priority || DEFAULT_NOTIFICATION_PRIORITY,
      JSON.stringify(input.variables || []),
      input.status || "active",
      JSON.stringify(input.metadata || {}),
      timestamp,
      timestamp,
    );

  return getTemplateById(input.workspaceId, id)!;
}

export function updateTemplate(
  workspaceId: string,
  templateId: string,
  input: Partial<{
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
  }>,
): NotificationTemplate {
  const existing = getTemplateById(workspaceId, templateId);
  if (!existing) throw new Error("Template not found.");

  const timestamp = nowIso();
  let slug = existing.slug;
  if (input.slug !== undefined) {
    slug = slugify(input.slug) || existing.slug;
    const conflict = getTemplateBySlug(workspaceId, slug);
    if (conflict && conflict.id !== templateId) {
      throw new Error("Template slug already exists.");
    }
  }

  sqlite
    .prepare(
      `UPDATE "notification_template" SET
        "name" = ?, "slug" = ?, "category" = ?, "title" = ?, "body" = ?,
        "channelsJson" = ?, "priority" = ?, "variablesJson" = ?, "status" = ?,
        "metadataJson" = ?, "updatedAt" = ?
      WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      input.name?.trim() || existing.name,
      slug,
      input.category || existing.category,
      input.title?.trim() || existing.title,
      input.body?.trim() || existing.body,
      JSON.stringify(input.channels || existing.channels),
      input.priority || existing.priority,
      JSON.stringify(input.variables || existing.variables),
      input.status || existing.status,
      JSON.stringify(input.metadata || existing.metadata),
      timestamp,
      templateId,
      workspaceId,
    );

  return getTemplateById(workspaceId, templateId)!;
}

export function deleteTemplate(
  workspaceId: string,
  templateId: string,
): boolean {
  ensureNotificationsReady();
  const result = sqlite
    .prepare(
      `DELETE FROM "notification_template"
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(templateId, workspaceId);
  return result.changes > 0;
}

export function listNotifications(
  workspaceId: string,
  filters: NotificationListFilters = {},
): AppNotification[] {
  ensureNotificationsReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.userId) {
    clauses.push(`"userId" = ?`);
    params.push(filters.userId);
  }
  if (filters.q) {
    clauses.push(
      `("title" LIKE ? ESCAPE '\\' OR "body" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.priority) {
    clauses.push(`"priority" = ?`);
    params.push(filters.priority);
  }
  if (filters.category) {
    clauses.push(`"category" = ?`);
    params.push(filters.category);
  }
  if (filters.unreadOnly) {
    clauses.push(`"isRead" = 0`);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "notification"
       WHERE ${clauses.join(" AND ")}
       ORDER BY
         CASE "priority"
           WHEN 'urgent' THEN 0
           WHEN 'high' THEN 1
           WHEN 'normal' THEN 2
           ELSE 3
         END,
         "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToNotification);
}

export function getNotificationById(
  workspaceId: string,
  notificationId: string,
): AppNotification | null {
  ensureNotificationsReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "notification"
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(notificationId, workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToNotification(row) : null;
}

export function createNotification(input: {
  workspaceId: string;
  userId?: string | null;
  templateId?: string | null;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  body: string;
  href?: string | null;
  status?: NotificationStatus;
  channels?: NotificationChannel[];
  crmEntityType?: string | null;
  crmEntityId?: string | null;
  metadata?: Record<string, unknown>;
  createdByUserId?: string | null;
}): AppNotification {
  ensureNotificationsReady();
  const id = randomUUID();
  const timestamp = nowIso();

  sqlite
    .prepare(
      `INSERT INTO "notification" (
        "id", "workspaceId", "userId", "templateId", "category", "priority",
        "title", "body", "href", "status", "channelsJson", "crmEntityType",
        "crmEntityId", "isRead", "readAt", "deliveredAt", "failedAt",
        "errorMessage", "metadataJson", "createdByUserId", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, NULL, NULL, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      asStringOrNull(input.userId),
      asStringOrNull(input.templateId),
      input.category || DEFAULT_NOTIFICATION_CATEGORY,
      input.priority || DEFAULT_NOTIFICATION_PRIORITY,
      input.title.trim(),
      input.body.trim(),
      asStringOrNull(input.href),
      input.status || "pending",
      JSON.stringify(input.channels || DEFAULT_NOTIFICATION_CHANNELS),
      asStringOrNull(input.crmEntityType),
      asStringOrNull(input.crmEntityId),
      JSON.stringify(input.metadata || {}),
      asStringOrNull(input.createdByUserId),
      timestamp,
      timestamp,
    );

  return getNotificationById(input.workspaceId, id)!;
}

export function updateNotification(
  workspaceId: string,
  notificationId: string,
  input: Partial<{
    status: NotificationStatus;
    isRead: boolean;
    readAt: string | null;
    deliveredAt: string | null;
    failedAt: string | null;
    errorMessage: string | null;
    metadata: Record<string, unknown>;
  }>,
): AppNotification {
  const existing = getNotificationById(workspaceId, notificationId);
  if (!existing) throw new Error("Notification not found.");

  const timestamp = nowIso();
  const isRead =
    input.isRead !== undefined ? input.isRead : existing.isRead;
  const readAt =
    input.readAt !== undefined
      ? input.readAt
      : isRead && !existing.readAt
        ? timestamp
        : existing.readAt;

  sqlite
    .prepare(
      `UPDATE "notification" SET
        "status" = ?, "isRead" = ?, "readAt" = ?, "deliveredAt" = ?,
        "failedAt" = ?, "errorMessage" = ?, "metadataJson" = ?, "updatedAt" = ?
      WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      input.status || existing.status,
      isRead ? 1 : 0,
      readAt,
      input.deliveredAt !== undefined
        ? input.deliveredAt
        : existing.deliveredAt,
      input.failedAt !== undefined ? input.failedAt : existing.failedAt,
      input.errorMessage !== undefined
        ? input.errorMessage
        : existing.errorMessage,
      JSON.stringify(input.metadata || existing.metadata),
      timestamp,
      notificationId,
      workspaceId,
    );

  return getNotificationById(workspaceId, notificationId)!;
}

export function markNotificationRead(
  workspaceId: string,
  notificationId: string,
  userId?: string | null,
): AppNotification {
  const existing = getNotificationById(workspaceId, notificationId);
  if (!existing) throw new Error("Notification not found.");
  if (userId && existing.userId && existing.userId !== userId) {
    throw new Error("Notification not found.");
  }
  return updateNotification(workspaceId, notificationId, {
    isRead: true,
    status: "read",
    readAt: nowIso(),
  });
}

export function markAllNotificationsRead(
  workspaceId: string,
  userId: string,
): number {
  ensureNotificationsReady();
  const timestamp = nowIso();
  const result = sqlite
    .prepare(
      `UPDATE "notification" SET
        "isRead" = 1, "status" = 'read', "readAt" = ?, "updatedAt" = ?
       WHERE "workspaceId" = ? AND "userId" = ? AND "isRead" = 0`,
    )
    .run(timestamp, timestamp, workspaceId, userId);
  return result.changes;
}

export function createDelivery(input: {
  notificationId: string;
  workspaceId: string;
  channel: NotificationChannel;
  status?: NotificationDeliveryStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  latencyMs?: number | null;
  raw?: Record<string, unknown>;
  sentAt?: string | null;
  deliveredAt?: string | null;
}): NotificationDelivery {
  ensureNotificationsReady();
  const id = randomUUID();
  const timestamp = nowIso();

  sqlite
    .prepare(
      `INSERT INTO "notification_delivery" (
        "id", "notificationId", "workspaceId", "channel", "status",
        "providerMessageId", "errorMessage", "latencyMs", "rawJson",
        "sentAt", "deliveredAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.notificationId,
      input.workspaceId,
      input.channel,
      input.status || "queued",
      asStringOrNull(input.providerMessageId),
      asStringOrNull(input.errorMessage),
      input.latencyMs ?? null,
      JSON.stringify(input.raw || {}),
      asStringOrNull(input.sentAt),
      asStringOrNull(input.deliveredAt),
      timestamp,
      timestamp,
    );

  return listDeliveries(input.workspaceId, input.notificationId).find(
    (row) => row.id === id,
  )!;
}

export function listDeliveries(
  workspaceId: string,
  notificationId: string,
): NotificationDelivery[] {
  ensureNotificationsReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "notification_delivery"
       WHERE "workspaceId" = ? AND "notificationId" = ?
       ORDER BY "createdAt" ASC`,
    )
    .all(workspaceId, notificationId) as Record<string, unknown>[];
  return rows.map(rowToDelivery);
}

export function listSubscriptions(
  workspaceId: string,
  filters: { userId?: string; channel?: string; activeOnly?: boolean } = {},
): NotificationSubscription[] {
  ensureNotificationsReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.userId) {
    clauses.push(`"userId" = ?`);
    params.push(filters.userId);
  }
  if (filters.channel) {
    clauses.push(`"channel" = ?`);
    params.push(filters.channel);
  }
  if (filters.activeOnly !== false) {
    clauses.push(`"isActive" = 1`);
  }

  const rows = sqlite
    .prepare(
      `SELECT * FROM "notification_subscription"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "updatedAt" DESC`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToSubscription);
}

export function upsertSubscription(input: {
  workspaceId: string;
  userId: string;
  channel: "push" | "browser";
  endpoint: string;
  p256dh?: string | null;
  auth?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): NotificationSubscription {
  ensureNotificationsReady();
  const endpoint = input.endpoint.trim();
  if (!endpoint) throw new Error("endpoint is required.");

  const existing = sqlite
    .prepare(
      `SELECT * FROM "notification_subscription"
       WHERE "workspaceId" = ? AND "userId" = ? AND "endpoint" = ?`,
    )
    .get(input.workspaceId, input.userId, endpoint) as
    | Record<string, unknown>
    | undefined;

  const timestamp = nowIso();
  if (existing) {
    sqlite
      .prepare(
        `UPDATE "notification_subscription" SET
          "channel" = ?, "p256dh" = ?, "auth" = ?, "userAgent" = ?,
          "isActive" = 1, "lastUsedAt" = ?, "metadataJson" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
      )
      .run(
        input.channel,
        asStringOrNull(input.p256dh) ?? existing.p256dh,
        asStringOrNull(input.auth) ?? existing.auth,
        asStringOrNull(input.userAgent) ?? existing.userAgent,
        timestamp,
        JSON.stringify(input.metadata || parseJson(existing.metadataJson, {})),
        timestamp,
        String(existing.id),
      );
    return listSubscriptions(input.workspaceId, {
      userId: input.userId,
      activeOnly: false,
    }).find((row) => row.id === String(existing.id))!;
  }

  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "notification_subscription" (
        "id", "workspaceId", "userId", "channel", "endpoint", "p256dh",
        "auth", "userAgent", "isActive", "lastUsedAt", "metadataJson",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.userId,
      input.channel,
      endpoint,
      asStringOrNull(input.p256dh),
      asStringOrNull(input.auth),
      asStringOrNull(input.userAgent),
      timestamp,
      JSON.stringify(input.metadata || {}),
      timestamp,
      timestamp,
    );

  return listSubscriptions(input.workspaceId, {
    userId: input.userId,
    activeOnly: false,
  }).find((row) => row.id === id)!;
}

export function deactivateSubscription(
  workspaceId: string,
  subscriptionId: string,
  userId?: string,
): boolean {
  ensureNotificationsReady();
  const clauses = [`"id" = ?`, `"workspaceId" = ?`];
  const params: unknown[] = [subscriptionId, workspaceId];
  if (userId) {
    clauses.push(`"userId" = ?`);
    params.push(userId);
  }
  const result = sqlite
    .prepare(
      `UPDATE "notification_subscription" SET
        "isActive" = 0, "updatedAt" = ?
       WHERE ${clauses.join(" AND ")}`,
    )
    .run(nowIso(), ...params);
  return result.changes > 0;
}

export function createNotificationLog(input: {
  workspaceId: string;
  operation: string;
  status?: NotificationLogStatus;
  channel?: NotificationChannel | null;
  notificationId?: string | null;
  userId?: string | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
  requestSummary?: string | null;
  responseSummary?: string | null;
  metadata?: Record<string, unknown>;
}): NotificationLog {
  ensureNotificationsReady();
  const id = randomUUID();
  const timestamp = nowIso();

  sqlite
    .prepare(
      `INSERT INTO "notification_log" (
        "id", "workspaceId", "operation", "status", "channel",
        "notificationId", "userId", "latencyMs", "errorMessage",
        "requestSummary", "responseSummary", "metadataJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.operation,
      input.status || "success",
      input.channel ?? null,
      asStringOrNull(input.notificationId),
      asStringOrNull(input.userId),
      input.latencyMs ?? null,
      asStringOrNull(input.errorMessage),
      asStringOrNull(input.requestSummary),
      asStringOrNull(input.responseSummary),
      JSON.stringify(input.metadata || {}),
      timestamp,
    );

  return listNotificationLogs(input.workspaceId, { limit: 1 }).find(
    (row) => row.id === id,
  )!;
}

export function listNotificationLogs(
  workspaceId: string,
  filters: NotificationListFilters = {},
): NotificationLog[] {
  ensureNotificationsReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.channel) {
    clauses.push(`"channel" = ?`);
    params.push(filters.channel);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "notification_log"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToLog);
}

export function createNotificationEvent(input: {
  workspaceId: string;
  notificationId?: string | null;
  userId?: string | null;
  type: NotificationEventType;
  channel?: NotificationChannel | null;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}): NotificationEvent {
  ensureNotificationsReady();
  const id = randomUUID();
  const timestamp = nowIso();
  const occurredAt = input.occurredAt || timestamp;

  sqlite
    .prepare(
      `INSERT INTO "notification_event" (
        "id", "workspaceId", "notificationId", "userId", "type", "channel",
        "metadataJson", "occurredAt", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      asStringOrNull(input.notificationId),
      asStringOrNull(input.userId),
      input.type,
      input.channel ?? null,
      JSON.stringify(input.metadata || {}),
      occurredAt,
      timestamp,
    );

  return listNotificationEvents(input.workspaceId, { limit: 1 }).find(
    (row) => row.id === id,
  )!;
}

export function listNotificationEvents(
  workspaceId: string,
  filters: NotificationListFilters = {},
): NotificationEvent[] {
  ensureNotificationsReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.type) {
    clauses.push(`"type" = ?`);
    params.push(filters.type);
  }
  if (filters.userId) {
    clauses.push(`"userId" = ?`);
    params.push(filters.userId);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "notification_event"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "occurredAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

export function getNotificationsOverview(
  workspaceId: string,
): NotificationOverviewStats {
  const settings = ensureWorkspaceNotifications(workspaceId);
  const today = todayStartIso();

  const total = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "notification" WHERE "workspaceId" = ?`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const unread = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "notification"
           WHERE "workspaceId" = ? AND "isRead" = 0`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const deliveredToday = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "notification"
           WHERE "workspaceId" = ? AND "deliveredAt" >= ?`,
        )
        .get(workspaceId, today) as { c: number }
    ).c,
  );
  const failedToday = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "notification"
           WHERE "workspaceId" = ? AND "failedAt" >= ?`,
        )
        .get(workspaceId, today) as { c: number }
    ).c,
  );
  const templates = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "notification_template"
           WHERE "workspaceId" = ?`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const subscriptions = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "notification_subscription"
           WHERE "workspaceId" = ? AND "isActive" = 1`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const logsToday = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "notification_log"
           WHERE "workspaceId" = ? AND "createdAt" >= ?`,
        )
        .get(workspaceId, today) as { c: number }
    ).c,
  );

  return {
    total,
    unread,
    deliveredToday,
    failedToday,
    templates,
    subscriptions,
    logsToday,
    inAppEnabled: settings.inAppEnabled,
    pushEnabled: settings.pushEnabled,
    emailEnabled: settings.emailEnabled,
    whatsappEnabled: settings.whatsappEnabled,
    browserEnabled: settings.browserEnabled,
    crmSyncEnabled: settings.crmSyncEnabled,
    automationEnabled: settings.automationEnabled,
    analyticsEnabled: settings.analyticsEnabled,
  };
}
