import { randomUUID } from "node:crypto";
import {
  generateVerifyToken,
  generateWebhookPathSecret,
  maskSecret,
  normalizePhone,
} from "@/lib/whatsapp/defaults";
import { migrateWhatsAppSchema } from "@/lib/whatsapp/migrate";
import type {
  WhatsAppBroadcast,
  WhatsAppBroadcastRecipient,
  WhatsAppBroadcastRecipientStatus,
  WhatsAppBroadcastStatus,
  WhatsAppContact,
  WhatsAppConversation,
  WhatsAppConversationStatus,
  WhatsAppListFilters,
  WhatsAppLog,
  WhatsAppLogStatus,
  WhatsAppMedia,
  WhatsAppMessage,
  WhatsAppMessageDirection,
  WhatsAppMessageStatus,
  WhatsAppMessageType,
  WhatsAppOverviewStats,
  WhatsAppSettings,
  WhatsAppTemplate,
  WhatsAppTemplateStatus,
} from "@/lib/whatsapp/types";
import {
  WHATSAPP_BROADCAST_RECIPIENT_STATUSES,
  WHATSAPP_BROADCAST_STATUSES,
  WHATSAPP_CONVERSATION_STATUSES,
  WHATSAPP_LOG_STATUSES,
  WHATSAPP_MESSAGE_DIRECTIONS,
  WHATSAPP_MESSAGE_STATUSES,
  WHATSAPP_MESSAGE_TYPES,
  WHATSAPP_TEMPLATE_STATUSES,
} from "@/lib/whatsapp/types";
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

export function ensureWhatsAppReady(): void {
  migrateWhatsAppSchema();
}

function rowToSettings(row: Record<string, unknown>): WhatsAppSettings {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    phoneNumberId: (row.phoneNumberId as string | null) ?? null,
    displayPhoneNumber: (row.displayPhoneNumber as string | null) ?? null,
    wabaId: (row.wabaId as string | null) ?? null,
    accessToken: (row.accessToken as string | null) ?? null,
    verifyToken: (row.verifyToken as string | null) ?? null,
    apiVersion: String(row.apiVersion || "v21.0"),
    businessName: (row.businessName as string | null) ?? null,
    isConnected: Boolean(row.isConnected),
    crmSyncEnabled: Boolean(row.crmSyncEnabled),
    chatbotEnabled: Boolean(row.chatbotEnabled),
    automationEnabled: Boolean(row.automationEnabled),
    defaultChatbotBotId: (row.defaultChatbotBotId as string | null) ?? null,
    webhookPathSecret: (row.webhookPathSecret as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export type WhatsAppSettingsPublic = Omit<WhatsAppSettings, "accessToken"> & {
  accessTokenMasked: string;
  verifyTokenMasked: string;
  webhookPathSecretMasked: string;
  hasAccessToken: boolean;
  hasVerifyToken: boolean;
};

export function toPublicSettings(
  settings: WhatsAppSettings,
): WhatsAppSettingsPublic {
  const { accessToken, ...rest } = settings;
  return {
    ...rest,
    accessTokenMasked: maskSecret(accessToken),
    verifyTokenMasked: maskSecret(settings.verifyToken),
    webhookPathSecretMasked: maskSecret(settings.webhookPathSecret),
    hasAccessToken: Boolean(accessToken),
    hasVerifyToken: Boolean(settings.verifyToken),
  };
}

function rowToContact(row: Record<string, unknown>): WhatsAppContact {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    waId: String(row.waId),
    phone: String(row.phone),
    profileName: (row.profileName as string | null) ?? null,
    crmContactId: (row.crmContactId as string | null) ?? null,
    crmLeadId: (row.crmLeadId as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    lastMessageAt: (row.lastMessageAt as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToConversation(row: Record<string, unknown>): WhatsAppConversation {
  const status = String(row.status || "open");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    contactId: String(row.contactId),
    waId: String(row.waId),
    phone: String(row.phone),
    status: WHATSAPP_CONVERSATION_STATUSES.includes(
      status as WhatsAppConversationStatus,
    )
      ? (status as WhatsAppConversationStatus)
      : "open",
    chatbotConversationId: (row.chatbotConversationId as string | null) ?? null,
    lastInboundAt: (row.lastInboundAt as string | null) ?? null,
    lastOutboundAt: (row.lastOutboundAt as string | null) ?? null,
    lastMessageAt: (row.lastMessageAt as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToMessage(row: Record<string, unknown>): WhatsAppMessage {
  const direction = String(row.direction || "inbound");
  const type = String(row.type || "text");
  const status = String(row.status || "queued");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    conversationId: String(row.conversationId),
    contactId: String(row.contactId),
    direction: WHATSAPP_MESSAGE_DIRECTIONS.includes(
      direction as WhatsAppMessageDirection,
    )
      ? (direction as WhatsAppMessageDirection)
      : "inbound",
    type: WHATSAPP_MESSAGE_TYPES.includes(type as WhatsAppMessageType)
      ? (type as WhatsAppMessageType)
      : "unknown",
    content: (row.content as string | null) ?? null,
    mediaId: (row.mediaId as string | null) ?? null,
    mediaUrl: (row.mediaUrl as string | null) ?? null,
    mediaMimeType: (row.mediaMimeType as string | null) ?? null,
    templateName: (row.templateName as string | null) ?? null,
    templateLanguage: (row.templateLanguage as string | null) ?? null,
    templateParams: parseJson(row.templateParamsJson, [] as string[]),
    status: WHATSAPP_MESSAGE_STATUSES.includes(status as WhatsAppMessageStatus)
      ? (status as WhatsAppMessageStatus)
      : "queued",
    providerMessageId: (row.providerMessageId as string | null) ?? null,
    errorMessage: (row.errorMessage as string | null) ?? null,
    raw: parseJson(row.rawJson, {}),
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToTemplate(row: Record<string, unknown>): WhatsAppTemplate {
  const status = String(row.status || "LOCAL");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    language: String(row.language || "en_US"),
    category: (row.category as string | null) ?? null,
    status: WHATSAPP_TEMPLATE_STATUSES.includes(status as WhatsAppTemplateStatus)
      ? (status as WhatsAppTemplateStatus)
      : "LOCAL",
    body: (row.body as string | null) ?? null,
    components: parseJson(row.componentsJson, [] as unknown[]),
    providerTemplateId: (row.providerTemplateId as string | null) ?? null,
    isLocal: Boolean(row.isLocal),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToMedia(row: Record<string, unknown>): WhatsAppMedia {
  const direction = String(row.direction || "outbound");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    providerMediaId: (row.providerMediaId as string | null) ?? null,
    mimeType: (row.mimeType as string | null) ?? null,
    fileName: (row.fileName as string | null) ?? null,
    fileSize:
      row.fileSize === null || row.fileSize === undefined
        ? null
        : Number(row.fileSize),
    sha256: (row.sha256 as string | null) ?? null,
    localPath: (row.localPath as string | null) ?? null,
    sourceUrl: (row.sourceUrl as string | null) ?? null,
    direction: WHATSAPP_MESSAGE_DIRECTIONS.includes(
      direction as WhatsAppMessageDirection,
    )
      ? (direction as WhatsAppMessageDirection)
      : "outbound",
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToBroadcast(row: Record<string, unknown>): WhatsAppBroadcast {
  const status = String(row.status || "draft");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    templateName: String(row.templateName),
    templateLanguage: String(row.templateLanguage || "en_US"),
    templateParams: parseJson(row.templateParamsJson, [] as string[]),
    status: WHATSAPP_BROADCAST_STATUSES.includes(
      status as WhatsAppBroadcastStatus,
    )
      ? (status as WhatsAppBroadcastStatus)
      : "draft",
    totalRecipients: Number(row.totalRecipients ?? 0),
    sentCount: Number(row.sentCount ?? 0),
    failedCount: Number(row.failedCount ?? 0),
    scheduledAt: (row.scheduledAt as string | null) ?? null,
    startedAt: (row.startedAt as string | null) ?? null,
    completedAt: (row.completedAt as string | null) ?? null,
    createdByUserId: (row.createdByUserId as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToBroadcastRecipient(
  row: Record<string, unknown>,
): WhatsAppBroadcastRecipient {
  const status = String(row.status || "pending");
  return {
    id: String(row.id),
    broadcastId: String(row.broadcastId),
    workspaceId: String(row.workspaceId),
    contactId: (row.contactId as string | null) ?? null,
    phone: String(row.phone),
    status: WHATSAPP_BROADCAST_RECIPIENT_STATUSES.includes(
      status as WhatsAppBroadcastRecipientStatus,
    )
      ? (status as WhatsAppBroadcastRecipientStatus)
      : "pending",
    providerMessageId: (row.providerMessageId as string | null) ?? null,
    errorMessage: (row.errorMessage as string | null) ?? null,
    sentAt: (row.sentAt as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToLog(row: Record<string, unknown>): WhatsAppLog {
  const status = String(row.status || "success");
  const direction = row.direction ? String(row.direction) : null;
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    operation: String(row.operation),
    status: WHATSAPP_LOG_STATUSES.includes(status as WhatsAppLogStatus)
      ? (status as WhatsAppLogStatus)
      : "success",
    direction:
      direction &&
      WHATSAPP_MESSAGE_DIRECTIONS.includes(
        direction as WhatsAppMessageDirection,
      )
        ? (direction as WhatsAppMessageDirection)
        : null,
    phone: (row.phone as string | null) ?? null,
    conversationId: (row.conversationId as string | null) ?? null,
    messageId: (row.messageId as string | null) ?? null,
    providerMessageId: (row.providerMessageId as string | null) ?? null,
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

export function getWhatsAppSettings(
  workspaceId: string,
): WhatsAppSettings | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(`SELECT * FROM "whatsapp_settings" WHERE "workspaceId" = ?`)
    .get(workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToSettings(row) : null;
}

export function ensureWorkspaceWhatsApp(workspaceId: string): WhatsAppSettings {
  ensureWhatsAppReady();
  const existing = getWhatsAppSettings(workspaceId);
  if (existing) return existing;

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "whatsapp_settings" (
        "id", "workspaceId", "phoneNumberId", "displayPhoneNumber", "wabaId",
        "accessToken", "verifyToken", "apiVersion", "businessName", "isConnected",
        "crmSyncEnabled", "chatbotEnabled", "automationEnabled",
        "defaultChatbotBotId", "webhookPathSecret", "createdAt", "updatedAt"
      ) VALUES (?, ?, NULL, NULL, NULL, NULL, ?, 'v21.0', NULL, 0, 1, 1, 1, NULL, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      generateVerifyToken(),
      generateWebhookPathSecret(),
      timestamp,
      timestamp,
    );
  return getWhatsAppSettings(workspaceId)!;
}

export function updateWhatsAppSettings(
  workspaceId: string,
  input: Partial<{
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
    regenerateVerifyToken: boolean;
    regenerateWebhookSecret: boolean;
  }>,
): WhatsAppSettings {
  const existing = ensureWorkspaceWhatsApp(workspaceId);
  const timestamp = nowIso();

  const verifyToken = input.regenerateVerifyToken
    ? generateVerifyToken()
    : input.verifyToken !== undefined
      ? asStringOrNull(input.verifyToken)
      : existing.verifyToken;

  const webhookPathSecret = input.regenerateWebhookSecret
    ? generateWebhookPathSecret()
    : existing.webhookPathSecret;

  const accessToken =
    input.accessToken !== undefined
      ? asStringOrNull(input.accessToken)
      : existing.accessToken;

  const phoneNumberId =
    input.phoneNumberId !== undefined
      ? asStringOrNull(input.phoneNumberId)
      : existing.phoneNumberId;

  const isConnected =
    input.isConnected !== undefined
      ? input.isConnected
      : Boolean(phoneNumberId && accessToken);

  sqlite
    .prepare(
      `UPDATE "whatsapp_settings" SET
        "phoneNumberId" = ?, "displayPhoneNumber" = ?, "wabaId" = ?,
        "accessToken" = ?, "verifyToken" = ?, "apiVersion" = ?,
        "businessName" = ?, "isConnected" = ?, "crmSyncEnabled" = ?,
        "chatbotEnabled" = ?, "automationEnabled" = ?, "defaultChatbotBotId" = ?,
        "webhookPathSecret" = ?, "updatedAt" = ?
       WHERE "workspaceId" = ?`,
    )
    .run(
      phoneNumberId,
      input.displayPhoneNumber !== undefined
        ? asStringOrNull(input.displayPhoneNumber)
        : existing.displayPhoneNumber,
      input.wabaId !== undefined
        ? asStringOrNull(input.wabaId)
        : existing.wabaId,
      accessToken,
      verifyToken,
      input.apiVersion?.trim() || existing.apiVersion,
      input.businessName !== undefined
        ? asStringOrNull(input.businessName)
        : existing.businessName,
      isConnected ? 1 : 0,
      input.crmSyncEnabled !== undefined
        ? input.crmSyncEnabled
          ? 1
          : 0
        : existing.crmSyncEnabled
          ? 1
          : 0,
      input.chatbotEnabled !== undefined
        ? input.chatbotEnabled
          ? 1
          : 0
        : existing.chatbotEnabled
          ? 1
          : 0,
      input.automationEnabled !== undefined
        ? input.automationEnabled
          ? 1
          : 0
        : existing.automationEnabled
          ? 1
          : 0,
      input.defaultChatbotBotId !== undefined
        ? asStringOrNull(input.defaultChatbotBotId)
        : existing.defaultChatbotBotId,
      webhookPathSecret,
      timestamp,
      workspaceId,
    );

  return getWhatsAppSettings(workspaceId)!;
}

export function getSettingsByPhoneNumberId(
  phoneNumberId: string,
): WhatsAppSettings | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_settings" WHERE "phoneNumberId" = ? LIMIT 1`,
    )
    .get(phoneNumberId) as Record<string, unknown> | undefined;
  return row ? rowToSettings(row) : null;
}

export function getSettingsByVerifyToken(
  verifyToken: string,
): WhatsAppSettings | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_settings" WHERE "verifyToken" = ? LIMIT 1`,
    )
    .get(verifyToken) as Record<string, unknown> | undefined;
  return row ? rowToSettings(row) : null;
}

export function getSettingsByWebhookSecret(
  secret: string,
): WhatsAppSettings | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_settings" WHERE "webhookPathSecret" = ? LIMIT 1`,
    )
    .get(secret) as Record<string, unknown> | undefined;
  return row ? rowToSettings(row) : null;
}

export function requireConnectedCredentials(workspaceId: string): {
  phoneNumberId: string;
  accessToken: string;
  wabaId: string | null;
  apiVersion: string;
  settings: WhatsAppSettings;
} {
  const settings = ensureWorkspaceWhatsApp(workspaceId);
  if (!settings.phoneNumberId || !settings.accessToken) {
    throw new Error(
      "WhatsApp is not connected. Configure Cloud API credentials in settings.",
    );
  }
  return {
    phoneNumberId: settings.phoneNumberId,
    accessToken: settings.accessToken,
    wabaId: settings.wabaId,
    apiVersion: settings.apiVersion,
    settings,
  };
}

export function getContactById(id: string): WhatsAppContact | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(`SELECT * FROM "whatsapp_contact" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToContact(row) : null;
}

export function getContactByWaId(
  workspaceId: string,
  waId: string,
): WhatsAppContact | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_contact" WHERE "workspaceId" = ? AND "waId" = ?`,
    )
    .get(workspaceId, normalizePhone(waId)) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToContact(row) : null;
}

export function listContacts(
  workspaceId: string,
  filters: WhatsAppListFilters = {},
): WhatsAppContact[] {
  ensureWhatsAppReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.q) {
    clauses.push(
      `("phone" LIKE ? ESCAPE '\\' OR "profileName" LIKE ? ESCAPE '\\' OR "waId" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_contact"
       WHERE ${clauses.join(" AND ")}
       ORDER BY COALESCE("lastMessageAt", "updatedAt") DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToContact);
}

export function upsertContact(input: {
  workspaceId: string;
  waId: string;
  phone?: string;
  profileName?: string | null;
  crmContactId?: string | null;
  crmLeadId?: string | null;
  metadata?: Record<string, unknown>;
  lastMessageAt?: string | null;
}): WhatsAppContact {
  ensureWhatsAppReady();
  const waId = normalizePhone(input.waId);
  const phone = normalizePhone(input.phone || input.waId);
  const existing = getContactByWaId(input.workspaceId, waId);
  const timestamp = nowIso();

  if (existing) {
    sqlite
      .prepare(
        `UPDATE "whatsapp_contact" SET
          "phone" = ?, "profileName" = ?, "crmContactId" = ?, "crmLeadId" = ?,
          "metadataJson" = ?, "lastMessageAt" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
      )
      .run(
        phone,
        input.profileName !== undefined
          ? asStringOrNull(input.profileName)
          : existing.profileName,
        input.crmContactId !== undefined
          ? asStringOrNull(input.crmContactId)
          : existing.crmContactId,
        input.crmLeadId !== undefined
          ? asStringOrNull(input.crmLeadId)
          : existing.crmLeadId,
        JSON.stringify(input.metadata ?? existing.metadata),
        input.lastMessageAt !== undefined
          ? asStringOrNull(input.lastMessageAt)
          : existing.lastMessageAt,
        timestamp,
        existing.id,
      );
    return getContactById(existing.id)!;
  }

  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "whatsapp_contact" (
        "id", "workspaceId", "waId", "phone", "profileName", "crmContactId",
        "crmLeadId", "metadataJson", "lastMessageAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      waId,
      phone,
      asStringOrNull(input.profileName),
      asStringOrNull(input.crmContactId),
      asStringOrNull(input.crmLeadId),
      JSON.stringify(input.metadata ?? {}),
      asStringOrNull(input.lastMessageAt),
      timestamp,
      timestamp,
    );
  return getContactById(id)!;
}

export function getConversationById(id: string): WhatsAppConversation | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(`SELECT * FROM "whatsapp_conversation" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToConversation(row) : null;
}

export function getOpenConversationByWaId(
  workspaceId: string,
  waId: string,
): WhatsAppConversation | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_conversation"
       WHERE "workspaceId" = ? AND "waId" = ? AND "status" != 'closed'
       ORDER BY COALESCE("lastMessageAt", "updatedAt") DESC
       LIMIT 1`,
    )
    .get(workspaceId, normalizePhone(waId)) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToConversation(row) : null;
}

export function listConversations(
  workspaceId: string,
  filters: WhatsAppListFilters = {},
): WhatsAppConversation[] {
  ensureWhatsAppReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.contactId) {
    clauses.push(`"contactId" = ?`);
    params.push(filters.contactId);
  }
  if (filters.q) {
    clauses.push(
      `("phone" LIKE ? ESCAPE '\\' OR "waId" LIKE ? ESCAPE '\\' OR "id" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_conversation"
       WHERE ${clauses.join(" AND ")}
       ORDER BY COALESCE("lastMessageAt", "updatedAt") DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToConversation);
}

export function createConversation(input: {
  workspaceId: string;
  contactId: string;
  waId: string;
  phone: string;
  status?: WhatsAppConversationStatus;
  chatbotConversationId?: string | null;
  metadata?: Record<string, unknown>;
}): WhatsAppConversation {
  ensureWhatsAppReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "whatsapp_conversation" (
        "id", "workspaceId", "contactId", "waId", "phone", "status",
        "chatbotConversationId", "lastInboundAt", "lastOutboundAt",
        "lastMessageAt", "metadataJson", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.contactId,
      normalizePhone(input.waId),
      normalizePhone(input.phone),
      input.status ?? "open",
      asStringOrNull(input.chatbotConversationId),
      JSON.stringify(input.metadata ?? {}),
      timestamp,
      timestamp,
    );
  return getConversationById(id)!;
}

export function updateConversation(
  id: string,
  workspaceId: string,
  input: Partial<{
    status: WhatsAppConversationStatus;
    chatbotConversationId: string | null;
    lastInboundAt: string | null;
    lastOutboundAt: string | null;
    lastMessageAt: string | null;
    metadata: Record<string, unknown>;
  }>,
): WhatsAppConversation {
  const existing = getConversationById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Conversation not found.");
  }
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "whatsapp_conversation" SET
        "status" = ?, "chatbotConversationId" = ?, "lastInboundAt" = ?,
        "lastOutboundAt" = ?, "lastMessageAt" = ?, "metadataJson" = ?,
        "updatedAt" = ?
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      input.status ?? existing.status,
      input.chatbotConversationId !== undefined
        ? asStringOrNull(input.chatbotConversationId)
        : existing.chatbotConversationId,
      input.lastInboundAt !== undefined
        ? asStringOrNull(input.lastInboundAt)
        : existing.lastInboundAt,
      input.lastOutboundAt !== undefined
        ? asStringOrNull(input.lastOutboundAt)
        : existing.lastOutboundAt,
      input.lastMessageAt !== undefined
        ? asStringOrNull(input.lastMessageAt)
        : existing.lastMessageAt,
      JSON.stringify(input.metadata ?? existing.metadata),
      timestamp,
      id,
      workspaceId,
    );
  return getConversationById(id)!;
}

export function ensureOpenConversation(input: {
  workspaceId: string;
  contact: WhatsAppContact;
}): WhatsAppConversation {
  const existing = getOpenConversationByWaId(
    input.workspaceId,
    input.contact.waId,
  );
  if (existing) return existing;
  return createConversation({
    workspaceId: input.workspaceId,
    contactId: input.contact.id,
    waId: input.contact.waId,
    phone: input.contact.phone,
  });
}

export function getMessageById(id: string): WhatsAppMessage | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(`SELECT * FROM "whatsapp_message" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToMessage(row) : null;
}

export function getMessageByProviderId(
  providerMessageId: string,
): WhatsAppMessage | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_message" WHERE "providerMessageId" = ? LIMIT 1`,
    )
    .get(providerMessageId) as Record<string, unknown> | undefined;
  return row ? rowToMessage(row) : null;
}

export function listMessages(
  workspaceId: string,
  filters: WhatsAppListFilters = {},
): WhatsAppMessage[] {
  ensureWhatsAppReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.conversationId) {
    clauses.push(`"conversationId" = ?`);
    params.push(filters.conversationId);
  }
  if (filters.contactId) {
    clauses.push(`"contactId" = ?`);
    params.push(filters.contactId);
  }
  if (filters.direction) {
    clauses.push(`"direction" = ?`);
    params.push(filters.direction);
  }
  if (filters.type) {
    clauses.push(`"type" = ?`);
    params.push(filters.type);
  }
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.q) {
    clauses.push(
      `("content" LIKE ? ESCAPE '\\' OR "templateName" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_message"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToMessage);
}

export function createMessage(input: {
  workspaceId: string;
  conversationId: string;
  contactId: string;
  direction: WhatsAppMessageDirection;
  type?: WhatsAppMessageType;
  content?: string | null;
  mediaId?: string | null;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  templateName?: string | null;
  templateLanguage?: string | null;
  templateParams?: string[];
  status?: WhatsAppMessageStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  raw?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): WhatsAppMessage {
  ensureWhatsAppReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "whatsapp_message" (
        "id", "workspaceId", "conversationId", "contactId", "direction", "type",
        "content", "mediaId", "mediaUrl", "mediaMimeType", "templateName",
        "templateLanguage", "templateParamsJson", "status", "providerMessageId",
        "errorMessage", "rawJson", "metadataJson", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.conversationId,
      input.contactId,
      input.direction,
      input.type ?? "text",
      asStringOrNull(input.content),
      asStringOrNull(input.mediaId),
      asStringOrNull(input.mediaUrl),
      asStringOrNull(input.mediaMimeType),
      asStringOrNull(input.templateName),
      asStringOrNull(input.templateLanguage),
      JSON.stringify(input.templateParams ?? []),
      input.status ?? (input.direction === "inbound" ? "received" : "queued"),
      asStringOrNull(input.providerMessageId),
      asStringOrNull(input.errorMessage),
      JSON.stringify(input.raw ?? {}),
      JSON.stringify(input.metadata ?? {}),
      timestamp,
      timestamp,
    );

  const patch: Partial<{
    lastInboundAt: string | null;
    lastOutboundAt: string | null;
    lastMessageAt: string | null;
  }> = { lastMessageAt: timestamp };
  if (input.direction === "inbound") patch.lastInboundAt = timestamp;
  else patch.lastOutboundAt = timestamp;
  updateConversation(input.conversationId, input.workspaceId, patch);
  const contact = getContactById(input.contactId);
  if (contact) {
    upsertContact({
      workspaceId: input.workspaceId,
      waId: contact.waId,
      lastMessageAt: timestamp,
    });
  }

  return getMessageById(id)!;
}

export function updateMessage(
  id: string,
  workspaceId: string,
  input: Partial<{
    status: WhatsAppMessageStatus;
    providerMessageId: string | null;
    errorMessage: string | null;
    mediaUrl: string | null;
    content: string | null;
    raw: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }>,
): WhatsAppMessage {
  const existing = getMessageById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Message not found.");
  }
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "whatsapp_message" SET
        "status" = ?, "providerMessageId" = ?, "errorMessage" = ?,
        "mediaUrl" = ?, "content" = ?, "rawJson" = ?, "metadataJson" = ?,
        "updatedAt" = ?
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      input.status ?? existing.status,
      input.providerMessageId !== undefined
        ? asStringOrNull(input.providerMessageId)
        : existing.providerMessageId,
      input.errorMessage !== undefined
        ? asStringOrNull(input.errorMessage)
        : existing.errorMessage,
      input.mediaUrl !== undefined
        ? asStringOrNull(input.mediaUrl)
        : existing.mediaUrl,
      input.content !== undefined
        ? asStringOrNull(input.content)
        : existing.content,
      JSON.stringify(input.raw ?? existing.raw),
      JSON.stringify(input.metadata ?? existing.metadata),
      timestamp,
      id,
      workspaceId,
    );
  return getMessageById(id)!;
}

export function listTemplates(
  workspaceId: string,
  filters: WhatsAppListFilters = {},
): WhatsAppTemplate[] {
  ensureWhatsAppReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.q) {
    clauses.push(
      `("name" LIKE ? ESCAPE '\\' OR "body" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);
  const rows = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_template"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "name" ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToTemplate);
}

export function getTemplateById(id: string): WhatsAppTemplate | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(`SELECT * FROM "whatsapp_template" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToTemplate(row) : null;
}

export function upsertTemplate(input: {
  workspaceId: string;
  name: string;
  language?: string;
  category?: string | null;
  status?: WhatsAppTemplateStatus;
  body?: string | null;
  components?: unknown[];
  providerTemplateId?: string | null;
  isLocal?: boolean;
}): WhatsAppTemplate {
  ensureWhatsAppReady();
  const language = input.language || "en_US";
  const existing = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_template"
       WHERE "workspaceId" = ? AND "name" = ? AND "language" = ?`,
    )
    .get(input.workspaceId, input.name, language) as
    | Record<string, unknown>
    | undefined;
  const timestamp = nowIso();

  if (existing) {
    sqlite
      .prepare(
        `UPDATE "whatsapp_template" SET
          "category" = ?, "status" = ?, "body" = ?, "componentsJson" = ?,
          "providerTemplateId" = ?, "isLocal" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
      )
      .run(
        input.category !== undefined
          ? asStringOrNull(input.category)
          : (existing.category as string | null),
        input.status ?? String(existing.status),
        input.body !== undefined
          ? asStringOrNull(input.body)
          : (existing.body as string | null),
        JSON.stringify(
          input.components ?? parseJson(existing.componentsJson, []),
        ),
        input.providerTemplateId !== undefined
          ? asStringOrNull(input.providerTemplateId)
          : (existing.providerTemplateId as string | null),
        input.isLocal !== undefined
          ? input.isLocal
            ? 1
            : 0
          : existing.isLocal
            ? 1
            : 0,
        timestamp,
        String(existing.id),
      );
    return getTemplateById(String(existing.id))!;
  }

  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "whatsapp_template" (
        "id", "workspaceId", "name", "language", "category", "status", "body",
        "componentsJson", "providerTemplateId", "isLocal", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.name.trim(),
      language,
      asStringOrNull(input.category),
      input.status ?? "LOCAL",
      asStringOrNull(input.body),
      JSON.stringify(input.components ?? []),
      asStringOrNull(input.providerTemplateId),
      input.isLocal === false ? 0 : 1,
      timestamp,
      timestamp,
    );
  return getTemplateById(id)!;
}

export function deleteTemplate(id: string, workspaceId: string): void {
  ensureWhatsAppReady();
  const template = getTemplateById(id);
  if (!template || template.workspaceId !== workspaceId) {
    throw new Error("Template not found.");
  }
  sqlite
    .prepare(
      `DELETE FROM "whatsapp_template" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(id, workspaceId);
}

export function createMedia(input: {
  workspaceId: string;
  providerMediaId?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  sha256?: string | null;
  localPath?: string | null;
  sourceUrl?: string | null;
  direction?: WhatsAppMessageDirection;
  metadata?: Record<string, unknown>;
}): WhatsAppMedia {
  ensureWhatsAppReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "whatsapp_media" (
        "id", "workspaceId", "providerMediaId", "mimeType", "fileName",
        "fileSize", "sha256", "localPath", "sourceUrl", "direction",
        "metadataJson", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      asStringOrNull(input.providerMediaId),
      asStringOrNull(input.mimeType),
      asStringOrNull(input.fileName),
      input.fileSize ?? null,
      asStringOrNull(input.sha256),
      asStringOrNull(input.localPath),
      asStringOrNull(input.sourceUrl),
      input.direction ?? "outbound",
      JSON.stringify(input.metadata ?? {}),
      timestamp,
      timestamp,
    );
  return getMediaById(id)!;
}

export function getMediaById(id: string): WhatsAppMedia | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(`SELECT * FROM "whatsapp_media" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToMedia(row) : null;
}

export function listMedia(
  workspaceId: string,
  filters: WhatsAppListFilters = {},
): WhatsAppMedia[] {
  ensureWhatsAppReady();
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  const rows = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_media"
       WHERE "workspaceId" = ?
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(workspaceId, limit, offset) as Record<string, unknown>[];
  return rows.map(rowToMedia);
}

export function getBroadcastById(id: string): WhatsAppBroadcast | null {
  ensureWhatsAppReady();
  const row = sqlite
    .prepare(`SELECT * FROM "whatsapp_broadcast" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToBroadcast(row) : null;
}

export function listBroadcasts(
  workspaceId: string,
  filters: WhatsAppListFilters = {},
): WhatsAppBroadcast[] {
  ensureWhatsAppReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.q) {
    clauses.push(`("name" LIKE ? ESCAPE '\\' OR "templateName" LIKE ? ESCAPE '\\')`);
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);
  const rows = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_broadcast"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToBroadcast);
}

export function createBroadcast(input: {
  workspaceId: string;
  name: string;
  templateName: string;
  templateLanguage?: string;
  templateParams?: string[];
  scheduledAt?: string | null;
  createdByUserId?: string | null;
  recipients: Array<{ phone: string; contactId?: string | null }>;
}): WhatsAppBroadcast {
  ensureWhatsAppReady();
  if (!input.name.trim()) throw new Error("Broadcast name is required.");
  if (!input.templateName.trim()) {
    throw new Error("Broadcast templateName is required.");
  }
  if (!input.recipients.length) {
    throw new Error("Broadcast requires at least one recipient.");
  }

  const id = randomUUID();
  const timestamp = nowIso();
  const uniqueRecipients = new Map<
    string,
    { phone: string; contactId: string | null }
  >();
  for (const recipient of input.recipients) {
    const phone = normalizePhone(recipient.phone);
    if (!phone) continue;
    uniqueRecipients.set(phone, {
      phone,
      contactId: asStringOrNull(recipient.contactId),
    });
  }
  if (!uniqueRecipients.size) {
    throw new Error("Broadcast requires at least one valid recipient phone.");
  }

  sqlite
    .prepare(
      `INSERT INTO "whatsapp_broadcast" (
        "id", "workspaceId", "name", "templateName", "templateLanguage",
        "templateParamsJson", "status", "totalRecipients", "sentCount",
        "failedCount", "scheduledAt", "startedAt", "completedAt",
        "createdByUserId", "metadataJson", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, 0, 0, ?, NULL, NULL, ?, '{}', ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.name.trim(),
      input.templateName.trim(),
      input.templateLanguage || "en_US",
      JSON.stringify(input.templateParams ?? []),
      uniqueRecipients.size,
      asStringOrNull(input.scheduledAt),
      asStringOrNull(input.createdByUserId),
      timestamp,
      timestamp,
    );

  const insertRecipient = sqlite.prepare(
    `INSERT INTO "whatsapp_broadcast_recipient" (
      "id", "broadcastId", "workspaceId", "contactId", "phone", "status",
      "providerMessageId", "errorMessage", "sentAt", "createdAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, NULL, ?, ?)`,
  );

  for (const recipient of uniqueRecipients.values()) {
    insertRecipient.run(
      randomUUID(),
      id,
      input.workspaceId,
      recipient.contactId,
      recipient.phone,
      timestamp,
      timestamp,
    );
  }

  return getBroadcastById(id)!;
}

export function updateBroadcast(
  id: string,
  workspaceId: string,
  input: Partial<{
    status: WhatsAppBroadcastStatus;
    sentCount: number;
    failedCount: number;
    startedAt: string | null;
    completedAt: string | null;
    scheduledAt: string | null;
  }>,
): WhatsAppBroadcast {
  const existing = getBroadcastById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Broadcast not found.");
  }
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "whatsapp_broadcast" SET
        "status" = ?, "sentCount" = ?, "failedCount" = ?, "startedAt" = ?,
        "completedAt" = ?, "scheduledAt" = ?, "updatedAt" = ?
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      input.status ?? existing.status,
      input.sentCount ?? existing.sentCount,
      input.failedCount ?? existing.failedCount,
      input.startedAt !== undefined
        ? asStringOrNull(input.startedAt)
        : existing.startedAt,
      input.completedAt !== undefined
        ? asStringOrNull(input.completedAt)
        : existing.completedAt,
      input.scheduledAt !== undefined
        ? asStringOrNull(input.scheduledAt)
        : existing.scheduledAt,
      timestamp,
      id,
      workspaceId,
    );
  return getBroadcastById(id)!;
}

export function listBroadcastRecipients(
  broadcastId: string,
  workspaceId: string,
): WhatsAppBroadcastRecipient[] {
  ensureWhatsAppReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_broadcast_recipient"
       WHERE "broadcastId" = ? AND "workspaceId" = ?
       ORDER BY "createdAt" ASC`,
    )
    .all(broadcastId, workspaceId) as Record<string, unknown>[];
  return rows.map(rowToBroadcastRecipient);
}

export function updateBroadcastRecipient(
  id: string,
  workspaceId: string,
  input: Partial<{
    status: WhatsAppBroadcastRecipientStatus;
    providerMessageId: string | null;
    errorMessage: string | null;
    sentAt: string | null;
  }>,
): WhatsAppBroadcastRecipient {
  ensureWhatsAppReady();
  const existing = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_broadcast_recipient"
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(id, workspaceId) as Record<string, unknown> | undefined;
  if (!existing) throw new Error("Broadcast recipient not found.");

  const current = rowToBroadcastRecipient(existing);
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "whatsapp_broadcast_recipient" SET
        "status" = ?, "providerMessageId" = ?, "errorMessage" = ?,
        "sentAt" = ?, "updatedAt" = ?
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      input.status ?? current.status,
      input.providerMessageId !== undefined
        ? asStringOrNull(input.providerMessageId)
        : current.providerMessageId,
      input.errorMessage !== undefined
        ? asStringOrNull(input.errorMessage)
        : current.errorMessage,
      input.sentAt !== undefined
        ? asStringOrNull(input.sentAt)
        : current.sentAt,
      timestamp,
      id,
      workspaceId,
    );

  const row = sqlite
    .prepare(`SELECT * FROM "whatsapp_broadcast_recipient" WHERE "id" = ?`)
    .get(id) as Record<string, unknown>;
  return rowToBroadcastRecipient(row);
}

export function createWhatsAppLog(input: {
  workspaceId: string;
  operation: string;
  status?: WhatsAppLogStatus;
  direction?: WhatsAppMessageDirection | null;
  phone?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  providerMessageId?: string | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
  requestSummary?: string | null;
  responseSummary?: string | null;
  metadata?: Record<string, unknown>;
}): WhatsAppLog {
  ensureWhatsAppReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "whatsapp_log" (
        "id", "workspaceId", "operation", "status", "direction", "phone",
        "conversationId", "messageId", "providerMessageId", "latencyMs",
        "errorMessage", "requestSummary", "responseSummary", "metadataJson",
        "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.operation,
      input.status ?? "success",
      input.direction ?? null,
      asStringOrNull(input.phone),
      asStringOrNull(input.conversationId),
      asStringOrNull(input.messageId),
      asStringOrNull(input.providerMessageId),
      input.latencyMs ?? null,
      asStringOrNull(input.errorMessage),
      asStringOrNull(input.requestSummary),
      asStringOrNull(input.responseSummary),
      JSON.stringify(input.metadata ?? {}),
      timestamp,
    );
  const row = sqlite
    .prepare(`SELECT * FROM "whatsapp_log" WHERE "id" = ?`)
    .get(id) as Record<string, unknown>;
  return rowToLog(row);
}

export function listWhatsAppLogs(
  workspaceId: string,
  filters: WhatsAppListFilters = {},
): WhatsAppLog[] {
  ensureWhatsAppReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.q) {
    clauses.push(
      `("operation" LIKE ? ESCAPE '\\' OR "requestSummary" LIKE ? ESCAPE '\\' OR "errorMessage" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern);
  }
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);
  const rows = sqlite
    .prepare(
      `SELECT * FROM "whatsapp_log"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToLog);
}

export function getWhatsAppOverview(workspaceId: string): WhatsAppOverviewStats {
  const settings = ensureWorkspaceWhatsApp(workspaceId);
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayStartIso = dayStart.toISOString();

  const contacts = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "whatsapp_contact" WHERE "workspaceId" = ?`,
      )
      .get(workspaceId) as { c: number }
  ).c;
  const conversations = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "whatsapp_conversation" WHERE "workspaceId" = ?`,
      )
      .get(workspaceId) as { c: number }
  ).c;
  const messagesToday = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "whatsapp_message"
         WHERE "workspaceId" = ? AND "createdAt" >= ?`,
      )
      .get(workspaceId, dayStartIso) as { c: number }
  ).c;
  const templatesApproved = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "whatsapp_template"
         WHERE "workspaceId" = ? AND "status" = 'APPROVED'`,
      )
      .get(workspaceId) as { c: number }
  ).c;
  const broadcastsActive = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "whatsapp_broadcast"
         WHERE "workspaceId" = ? AND "status" IN ('draft', 'scheduled', 'sending')`,
      )
      .get(workspaceId) as { c: number }
  ).c;
  const logsToday = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM "whatsapp_log"
         WHERE "workspaceId" = ? AND "createdAt" >= ?`,
      )
      .get(workspaceId, dayStartIso) as { c: number }
  ).c;

  return {
    isConnected: settings.isConnected,
    contacts,
    conversations,
    messagesToday,
    templatesApproved,
    broadcastsActive,
    logsToday,
    crmSyncEnabled: settings.crmSyncEnabled,
    chatbotEnabled: settings.chatbotEnabled,
    automationEnabled: settings.automationEnabled,
    displayPhoneNumber: settings.displayPhoneNumber,
    businessName: settings.businessName,
  };
}
