import { randomUUID } from "node:crypto";
import {
  DEFAULT_EMAIL_PROVIDER,
  DEFAULT_SES_REGION,
  DEFAULT_SMTP_PORT,
  generateTrackingSecret,
  generateWebhookPathSecret,
  isValidEmail,
  maskSecret,
  normalizeEmail,
  slugify,
} from "@/lib/email-engine/defaults";
import { migrateEmailEngineSchema } from "@/lib/email-engine/migrate";
import type {
  EmailCampaign,
  EmailCampaignRecipient,
  EmailCampaignRecipientStatus,
  EmailCampaignStatus,
  EmailContact,
  EmailContactStatus,
  EmailEvent,
  EmailEventType,
  EmailListFilters,
  EmailLog,
  EmailLogStatus,
  EmailMessage,
  EmailMessageKind,
  EmailMessageStatus,
  EmailOverviewStats,
  EmailProvider,
  EmailProviderCredentials,
  EmailSettings,
  EmailTemplate,
  EmailTemplateCategory,
  EmailTemplateStatus,
} from "@/lib/email-engine/types";
import {
  EMAIL_CAMPAIGN_RECIPIENT_STATUSES,
  EMAIL_CAMPAIGN_STATUSES,
  EMAIL_CONTACT_STATUSES,
  EMAIL_EVENT_TYPES,
  EMAIL_LOG_STATUSES,
  EMAIL_MESSAGE_KINDS,
  EMAIL_MESSAGE_STATUSES,
  EMAIL_PROVIDERS,
  EMAIL_TEMPLATE_CATEGORIES,
  EMAIL_TEMPLATE_STATUSES,
} from "@/lib/email-engine/types";
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

export function ensureEmailEngineReady(): void {
  migrateEmailEngineSchema();
}

function rowToSettings(row: Record<string, unknown>): EmailSettings {
  const provider = String(row.provider || DEFAULT_EMAIL_PROVIDER);
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    provider: EMAIL_PROVIDERS.includes(provider as EmailProvider)
      ? (provider as EmailProvider)
      : DEFAULT_EMAIL_PROVIDER,
    fromEmail: (row.fromEmail as string | null) ?? null,
    fromName: (row.fromName as string | null) ?? null,
    replyTo: (row.replyTo as string | null) ?? null,
    smtpHost: (row.smtpHost as string | null) ?? null,
    smtpPort:
      row.smtpPort === null || row.smtpPort === undefined
        ? null
        : Number(row.smtpPort),
    smtpSecure: Boolean(row.smtpSecure),
    smtpUser: (row.smtpUser as string | null) ?? null,
    smtpPassword: (row.smtpPassword as string | null) ?? null,
    resendApiKey: (row.resendApiKey as string | null) ?? null,
    sesAccessKeyId: (row.sesAccessKeyId as string | null) ?? null,
    sesSecretAccessKey: (row.sesSecretAccessKey as string | null) ?? null,
    sesRegion: String(row.sesRegion || DEFAULT_SES_REGION),
    isConnected: Boolean(row.isConnected),
    crmSyncEnabled: Boolean(row.crmSyncEnabled),
    automationEnabled: Boolean(row.automationEnabled),
    analyticsEnabled: Boolean(row.analyticsEnabled),
    openTrackingEnabled: Boolean(row.openTrackingEnabled),
    clickTrackingEnabled: Boolean(row.clickTrackingEnabled),
    webhookPathSecret: (row.webhookPathSecret as string | null) ?? null,
    trackingSecret: (row.trackingSecret as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export type EmailSettingsPublic = Omit<
  EmailSettings,
  "smtpPassword" | "resendApiKey" | "sesSecretAccessKey" | "trackingSecret"
> & {
  smtpPasswordMasked: string;
  resendApiKeyMasked: string;
  sesSecretAccessKeyMasked: string;
  trackingSecretMasked: string;
  webhookPathSecretMasked: string;
  hasSmtpPassword: boolean;
  hasResendApiKey: boolean;
  hasSesSecretAccessKey: boolean;
};

export function toPublicSettings(settings: EmailSettings): EmailSettingsPublic {
  const {
    smtpPassword,
    resendApiKey,
    sesSecretAccessKey,
    trackingSecret,
    ...rest
  } = settings;
  return {
    ...rest,
    smtpPasswordMasked: maskSecret(smtpPassword),
    resendApiKeyMasked: maskSecret(resendApiKey),
    sesSecretAccessKeyMasked: maskSecret(sesSecretAccessKey),
    trackingSecretMasked: maskSecret(trackingSecret),
    webhookPathSecretMasked: maskSecret(settings.webhookPathSecret),
    hasSmtpPassword: Boolean(smtpPassword),
    hasResendApiKey: Boolean(resendApiKey),
    hasSesSecretAccessKey: Boolean(sesSecretAccessKey),
  };
}

function rowToContact(row: Record<string, unknown>): EmailContact {
  const status = String(row.status || "subscribed");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    email: String(row.email),
    name: (row.name as string | null) ?? null,
    status: EMAIL_CONTACT_STATUSES.includes(status as EmailContactStatus)
      ? (status as EmailContactStatus)
      : "subscribed",
    crmContactId: (row.crmContactId as string | null) ?? null,
    crmLeadId: (row.crmLeadId as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    lastEmailAt: (row.lastEmailAt as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToTemplate(row: Record<string, unknown>): EmailTemplate {
  const category = String(row.category || "transactional");
  const status = String(row.status || "active");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    slug: String(row.slug),
    category: EMAIL_TEMPLATE_CATEGORIES.includes(
      category as EmailTemplateCategory,
    )
      ? (category as EmailTemplateCategory)
      : "transactional",
    subject: String(row.subject),
    html: String(row.html || ""),
    text: (row.text as string | null) ?? null,
    variables: parseJson(row.variablesJson, [] as string[]),
    status: EMAIL_TEMPLATE_STATUSES.includes(status as EmailTemplateStatus)
      ? (status as EmailTemplateStatus)
      : "active",
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToMessage(row: Record<string, unknown>): EmailMessage {
  const kind = String(row.kind || "transactional");
  const status = String(row.status || "queued");
  const provider = row.provider ? String(row.provider) : null;
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    contactId: (row.contactId as string | null) ?? null,
    templateId: (row.templateId as string | null) ?? null,
    campaignId: (row.campaignId as string | null) ?? null,
    kind: EMAIL_MESSAGE_KINDS.includes(kind as EmailMessageKind)
      ? (kind as EmailMessageKind)
      : "transactional",
    provider:
      provider && EMAIL_PROVIDERS.includes(provider as EmailProvider)
        ? (provider as EmailProvider)
        : null,
    toEmail: String(row.toEmail),
    toName: (row.toName as string | null) ?? null,
    fromEmail: (row.fromEmail as string | null) ?? null,
    fromName: (row.fromName as string | null) ?? null,
    replyTo: (row.replyTo as string | null) ?? null,
    subject: String(row.subject),
    html: (row.html as string | null) ?? null,
    text: (row.text as string | null) ?? null,
    status: EMAIL_MESSAGE_STATUSES.includes(status as EmailMessageStatus)
      ? (status as EmailMessageStatus)
      : "queued",
    providerMessageId: (row.providerMessageId as string | null) ?? null,
    trackingToken: (row.trackingToken as string | null) ?? null,
    errorMessage: (row.errorMessage as string | null) ?? null,
    openCount: Number(row.openCount ?? 0),
    clickCount: Number(row.clickCount ?? 0),
    sentAt: (row.sentAt as string | null) ?? null,
    deliveredAt: (row.deliveredAt as string | null) ?? null,
    openedAt: (row.openedAt as string | null) ?? null,
    clickedAt: (row.clickedAt as string | null) ?? null,
    bouncedAt: (row.bouncedAt as string | null) ?? null,
    raw: parseJson(row.rawJson, {}),
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToCampaign(row: Record<string, unknown>): EmailCampaign {
  const status = String(row.status || "draft");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    templateId: (row.templateId as string | null) ?? null,
    subject: String(row.subject),
    html: (row.html as string | null) ?? null,
    text: (row.text as string | null) ?? null,
    status: EMAIL_CAMPAIGN_STATUSES.includes(status as EmailCampaignStatus)
      ? (status as EmailCampaignStatus)
      : "draft",
    totalRecipients: Number(row.totalRecipients ?? 0),
    sentCount: Number(row.sentCount ?? 0),
    failedCount: Number(row.failedCount ?? 0),
    openCount: Number(row.openCount ?? 0),
    clickCount: Number(row.clickCount ?? 0),
    bounceCount: Number(row.bounceCount ?? 0),
    scheduledAt: (row.scheduledAt as string | null) ?? null,
    startedAt: (row.startedAt as string | null) ?? null,
    completedAt: (row.completedAt as string | null) ?? null,
    createdByUserId: (row.createdByUserId as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToCampaignRecipient(
  row: Record<string, unknown>,
): EmailCampaignRecipient {
  const status = String(row.status || "pending");
  return {
    id: String(row.id),
    campaignId: String(row.campaignId),
    workspaceId: String(row.workspaceId),
    contactId: (row.contactId as string | null) ?? null,
    email: String(row.email),
    name: (row.name as string | null) ?? null,
    messageId: (row.messageId as string | null) ?? null,
    status: EMAIL_CAMPAIGN_RECIPIENT_STATUSES.includes(
      status as EmailCampaignRecipientStatus,
    )
      ? (status as EmailCampaignRecipientStatus)
      : "pending",
    providerMessageId: (row.providerMessageId as string | null) ?? null,
    errorMessage: (row.errorMessage as string | null) ?? null,
    sentAt: (row.sentAt as string | null) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToLog(row: Record<string, unknown>): EmailLog {
  const status = String(row.status || "success");
  const provider = row.provider ? String(row.provider) : null;
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    operation: String(row.operation),
    status: EMAIL_LOG_STATUSES.includes(status as EmailLogStatus)
      ? (status as EmailLogStatus)
      : "success",
    provider:
      provider && EMAIL_PROVIDERS.includes(provider as EmailProvider)
        ? (provider as EmailProvider)
        : null,
    email: (row.email as string | null) ?? null,
    messageId: (row.messageId as string | null) ?? null,
    campaignId: (row.campaignId as string | null) ?? null,
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

function rowToEvent(row: Record<string, unknown>): EmailEvent {
  const type = String(row.type || "sent");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    messageId: (row.messageId as string | null) ?? null,
    campaignId: (row.campaignId as string | null) ?? null,
    contactId: (row.contactId as string | null) ?? null,
    type: EMAIL_EVENT_TYPES.includes(type as EmailEventType)
      ? (type as EmailEventType)
      : "sent",
    email: (row.email as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    providerMessageId: (row.providerMessageId as string | null) ?? null,
    userAgent: (row.userAgent as string | null) ?? null,
    ipHash: (row.ipHash as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    occurredAt: String(row.occurredAt),
    createdAt: String(row.createdAt),
  };
}

export function getEmailSettings(workspaceId: string): EmailSettings | null {
  ensureEmailEngineReady();
  const row = sqlite
    .prepare(`SELECT * FROM "email_settings" WHERE "workspaceId" = ?`)
    .get(workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToSettings(row) : null;
}

export function ensureWorkspaceEmail(workspaceId: string): EmailSettings {
  ensureEmailEngineReady();
  const existing = getEmailSettings(workspaceId);
  if (existing) return existing;

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "email_settings" (
        "id", "workspaceId", "provider", "fromEmail", "fromName", "replyTo",
        "smtpHost", "smtpPort", "smtpSecure", "smtpUser", "smtpPassword",
        "resendApiKey", "sesAccessKeyId", "sesSecretAccessKey", "sesRegion",
        "isConnected", "crmSyncEnabled", "automationEnabled", "analyticsEnabled",
        "openTrackingEnabled", "clickTrackingEnabled", "webhookPathSecret",
        "trackingSecret", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, ?, 0, 1, 1, 1, 1, 1, ?, ?, ?, ?)`,
    )
    .run(
      id,
      workspaceId,
      DEFAULT_EMAIL_PROVIDER,
      DEFAULT_SES_REGION,
      generateWebhookPathSecret(),
      generateTrackingSecret(),
      timestamp,
      timestamp,
    );
  return getEmailSettings(workspaceId)!;
}

function credentialsReady(settings: EmailSettings): boolean {
  if (!settings.fromEmail || !isValidEmail(settings.fromEmail)) return false;
  if (settings.provider === "resend") return Boolean(settings.resendApiKey);
  if (settings.provider === "ses") {
    return Boolean(settings.sesAccessKeyId && settings.sesSecretAccessKey);
  }
  return Boolean(settings.smtpHost);
}

export function updateEmailSettings(
  workspaceId: string,
  input: Partial<{
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
    regenerateWebhookSecret: boolean;
    regenerateTrackingSecret: boolean;
  }>,
): EmailSettings {
  const existing = ensureWorkspaceEmail(workspaceId);
  const timestamp = nowIso();

  const next: EmailSettings = {
    ...existing,
    provider: input.provider ?? existing.provider,
    fromEmail:
      input.fromEmail !== undefined
        ? asStringOrNull(input.fromEmail)
        : existing.fromEmail,
    fromName:
      input.fromName !== undefined
        ? asStringOrNull(input.fromName)
        : existing.fromName,
    replyTo:
      input.replyTo !== undefined
        ? asStringOrNull(input.replyTo)
        : existing.replyTo,
    smtpHost:
      input.smtpHost !== undefined
        ? asStringOrNull(input.smtpHost)
        : existing.smtpHost,
    smtpPort:
      input.smtpPort !== undefined ? input.smtpPort : existing.smtpPort,
    smtpSecure:
      input.smtpSecure !== undefined ? input.smtpSecure : existing.smtpSecure,
    smtpUser:
      input.smtpUser !== undefined
        ? asStringOrNull(input.smtpUser)
        : existing.smtpUser,
    smtpPassword:
      input.smtpPassword !== undefined
        ? asStringOrNull(input.smtpPassword)
        : existing.smtpPassword,
    resendApiKey:
      input.resendApiKey !== undefined
        ? asStringOrNull(input.resendApiKey)
        : existing.resendApiKey,
    sesAccessKeyId:
      input.sesAccessKeyId !== undefined
        ? asStringOrNull(input.sesAccessKeyId)
        : existing.sesAccessKeyId,
    sesSecretAccessKey:
      input.sesSecretAccessKey !== undefined
        ? asStringOrNull(input.sesSecretAccessKey)
        : existing.sesSecretAccessKey,
    sesRegion: input.sesRegion?.trim() || existing.sesRegion,
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
    openTrackingEnabled:
      input.openTrackingEnabled !== undefined
        ? input.openTrackingEnabled
        : existing.openTrackingEnabled,
    clickTrackingEnabled:
      input.clickTrackingEnabled !== undefined
        ? input.clickTrackingEnabled
        : existing.clickTrackingEnabled,
    webhookPathSecret: input.regenerateWebhookSecret
      ? generateWebhookPathSecret()
      : existing.webhookPathSecret,
    trackingSecret: input.regenerateTrackingSecret
      ? generateTrackingSecret()
      : existing.trackingSecret,
  };

  const isConnected =
    input.isConnected !== undefined
      ? input.isConnected
      : credentialsReady(next);

  sqlite
    .prepare(
      `UPDATE "email_settings" SET
        "provider" = ?, "fromEmail" = ?, "fromName" = ?, "replyTo" = ?,
        "smtpHost" = ?, "smtpPort" = ?, "smtpSecure" = ?, "smtpUser" = ?,
        "smtpPassword" = ?, "resendApiKey" = ?, "sesAccessKeyId" = ?,
        "sesSecretAccessKey" = ?, "sesRegion" = ?, "isConnected" = ?,
        "crmSyncEnabled" = ?, "automationEnabled" = ?, "analyticsEnabled" = ?,
        "openTrackingEnabled" = ?, "clickTrackingEnabled" = ?,
        "webhookPathSecret" = ?, "trackingSecret" = ?, "updatedAt" = ?
       WHERE "workspaceId" = ?`,
    )
    .run(
      next.provider,
      next.fromEmail,
      next.fromName,
      next.replyTo,
      next.smtpHost,
      next.smtpPort,
      next.smtpSecure ? 1 : 0,
      next.smtpUser,
      next.smtpPassword,
      next.resendApiKey,
      next.sesAccessKeyId,
      next.sesSecretAccessKey,
      next.sesRegion,
      isConnected ? 1 : 0,
      next.crmSyncEnabled ? 1 : 0,
      next.automationEnabled ? 1 : 0,
      next.analyticsEnabled ? 1 : 0,
      next.openTrackingEnabled ? 1 : 0,
      next.clickTrackingEnabled ? 1 : 0,
      next.webhookPathSecret,
      next.trackingSecret,
      timestamp,
      workspaceId,
    );

  return getEmailSettings(workspaceId)!;
}

export function getSettingsByWebhookSecret(
  secret: string,
): EmailSettings | null {
  ensureEmailEngineReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "email_settings" WHERE "webhookPathSecret" = ? LIMIT 1`,
    )
    .get(secret) as Record<string, unknown> | undefined;
  return row ? rowToSettings(row) : null;
}

export function requireConnectedCredentials(
  workspaceId: string,
): EmailProviderCredentials & { settings: EmailSettings } {
  const settings = ensureWorkspaceEmail(workspaceId);
  if (!settings.fromEmail || !isValidEmail(settings.fromEmail)) {
    throw new Error(
      "Email Engine is not connected. Configure a from address in settings.",
    );
  }

  if (settings.provider === "resend") {
    if (!settings.resendApiKey) {
      throw new Error(
        "Email Engine is not connected. Configure a Resend API key in settings.",
      );
    }
    return {
      provider: "resend",
      apiKey: settings.resendApiKey,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      settings,
    };
  }

  if (settings.provider === "ses") {
    if (!settings.sesAccessKeyId || !settings.sesSecretAccessKey) {
      throw new Error(
        "Email Engine is not connected. Configure Amazon SES credentials in settings.",
      );
    }
    return {
      provider: "ses",
      accessKeyId: settings.sesAccessKeyId,
      secretAccessKey: settings.sesSecretAccessKey,
      region: settings.sesRegion || DEFAULT_SES_REGION,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      settings,
    };
  }

  if (!settings.smtpHost) {
    throw new Error(
      "Email Engine is not connected. Configure SMTP host in settings.",
    );
  }

  return {
    provider: "smtp",
    host: settings.smtpHost,
    port: settings.smtpPort || DEFAULT_SMTP_PORT,
    secure: settings.smtpSecure,
    user: settings.smtpUser,
    password: settings.smtpPassword,
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
    settings,
  };
}

export function getContactById(id: string): EmailContact | null {
  ensureEmailEngineReady();
  const row = sqlite
    .prepare(`SELECT * FROM "email_contact" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToContact(row) : null;
}

export function getContactByEmail(
  workspaceId: string,
  email: string,
): EmailContact | null {
  ensureEmailEngineReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "email_contact" WHERE "workspaceId" = ? AND "email" = ?`,
    )
    .get(workspaceId, normalizeEmail(email)) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToContact(row) : null;
}

export function listContacts(
  workspaceId: string,
  filters: EmailListFilters = {},
): EmailContact[] {
  ensureEmailEngineReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.q) {
    clauses.push(
      `("email" LIKE ? ESCAPE '\\' OR "name" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
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
      `SELECT * FROM "email_contact"
       WHERE ${clauses.join(" AND ")}
       ORDER BY COALESCE("lastEmailAt", "updatedAt") DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToContact);
}

export function upsertContact(input: {
  workspaceId: string;
  email: string;
  name?: string | null;
  status?: EmailContactStatus;
  crmContactId?: string | null;
  crmLeadId?: string | null;
  metadata?: Record<string, unknown>;
  lastEmailAt?: string | null;
}): EmailContact {
  ensureEmailEngineReady();
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) throw new Error("Invalid email address.");

  const existing = getContactByEmail(input.workspaceId, email);
  const timestamp = nowIso();

  if (existing) {
    sqlite
      .prepare(
        `UPDATE "email_contact" SET
          "name" = ?, "status" = ?, "crmContactId" = ?, "crmLeadId" = ?,
          "metadataJson" = ?, "lastEmailAt" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
      )
      .run(
        input.name !== undefined
          ? asStringOrNull(input.name)
          : existing.name,
        input.status ?? existing.status,
        input.crmContactId !== undefined
          ? asStringOrNull(input.crmContactId)
          : existing.crmContactId,
        input.crmLeadId !== undefined
          ? asStringOrNull(input.crmLeadId)
          : existing.crmLeadId,
        JSON.stringify(input.metadata ?? existing.metadata),
        input.lastEmailAt !== undefined
          ? asStringOrNull(input.lastEmailAt)
          : existing.lastEmailAt,
        timestamp,
        existing.id,
      );
    return getContactById(existing.id)!;
  }

  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "email_contact" (
        "id", "workspaceId", "email", "name", "status", "crmContactId",
        "crmLeadId", "metadataJson", "lastEmailAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      email,
      asStringOrNull(input.name),
      input.status || "subscribed",
      asStringOrNull(input.crmContactId),
      asStringOrNull(input.crmLeadId),
      JSON.stringify(input.metadata ?? {}),
      asStringOrNull(input.lastEmailAt),
      timestamp,
      timestamp,
    );
  return getContactById(id)!;
}

export function getTemplateById(id: string): EmailTemplate | null {
  ensureEmailEngineReady();
  const row = sqlite
    .prepare(`SELECT * FROM "email_template" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToTemplate(row) : null;
}

export function getTemplateBySlug(
  workspaceId: string,
  slug: string,
): EmailTemplate | null {
  ensureEmailEngineReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "email_template" WHERE "workspaceId" = ? AND "slug" = ?`,
    )
    .get(workspaceId, slug) as Record<string, unknown> | undefined;
  return row ? rowToTemplate(row) : null;
}

export function listTemplates(
  workspaceId: string,
  filters: EmailListFilters = {},
): EmailTemplate[] {
  ensureEmailEngineReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.q) {
    clauses.push(
      `("name" LIKE ? ESCAPE '\\' OR "slug" LIKE ? ESCAPE '\\' OR "subject" LIKE ? ESCAPE '\\')`,
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
      `SELECT * FROM "email_template"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "updatedAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToTemplate);
}

export function createTemplate(input: {
  workspaceId: string;
  name: string;
  slug?: string;
  category?: EmailTemplateCategory;
  subject: string;
  html: string;
  text?: string | null;
  variables?: string[];
  status?: EmailTemplateStatus;
  metadata?: Record<string, unknown>;
}): EmailTemplate {
  ensureEmailEngineReady();
  const id = randomUUID();
  const timestamp = nowIso();
  let slug = slugify(input.slug || input.name) || `template-${id.slice(0, 8)}`;
  if (getTemplateBySlug(input.workspaceId, slug)) {
    slug = `${slug}-${id.slice(0, 6)}`;
  }

  sqlite
    .prepare(
      `INSERT INTO "email_template" (
        "id", "workspaceId", "name", "slug", "category", "subject", "html",
        "text", "variablesJson", "status", "metadataJson", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.name.trim(),
      slug,
      input.category || "transactional",
      input.subject.trim(),
      input.html,
      asStringOrNull(input.text),
      JSON.stringify(input.variables ?? []),
      input.status || "active",
      JSON.stringify(input.metadata ?? {}),
      timestamp,
      timestamp,
    );
  return getTemplateById(id)!;
}

export function updateTemplate(
  id: string,
  workspaceId: string,
  input: Partial<{
    name: string;
    slug: string;
    category: EmailTemplateCategory;
    subject: string;
    html: string;
    text: string | null;
    variables: string[];
    status: EmailTemplateStatus;
    metadata: Record<string, unknown>;
  }>,
): EmailTemplate {
  const existing = getTemplateById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Template not found.");
  }

  let slug = existing.slug;
  if (input.slug !== undefined) {
    slug = slugify(input.slug) || existing.slug;
    const conflict = getTemplateBySlug(workspaceId, slug);
    if (conflict && conflict.id !== id) {
      throw new Error("Template slug already exists.");
    }
  }

  sqlite
    .prepare(
      `UPDATE "email_template" SET
        "name" = ?, "slug" = ?, "category" = ?, "subject" = ?, "html" = ?,
        "text" = ?, "variablesJson" = ?, "status" = ?, "metadataJson" = ?,
        "updatedAt" = ?
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      input.name?.trim() || existing.name,
      slug,
      input.category || existing.category,
      input.subject?.trim() || existing.subject,
      input.html !== undefined ? input.html : existing.html,
      input.text !== undefined ? asStringOrNull(input.text) : existing.text,
      JSON.stringify(input.variables ?? existing.variables),
      input.status || existing.status,
      JSON.stringify(input.metadata ?? existing.metadata),
      nowIso(),
      id,
      workspaceId,
    );
  return getTemplateById(id)!;
}

export function deleteTemplate(id: string, workspaceId: string): void {
  ensureEmailEngineReady();
  sqlite
    .prepare(
      `DELETE FROM "email_template" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(id, workspaceId);
}

export function getMessageById(id: string): EmailMessage | null {
  ensureEmailEngineReady();
  const row = sqlite
    .prepare(`SELECT * FROM "email_message" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToMessage(row) : null;
}

export function getMessageByTrackingToken(
  token: string,
): EmailMessage | null {
  ensureEmailEngineReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "email_message" WHERE "trackingToken" = ? LIMIT 1`,
    )
    .get(token) as Record<string, unknown> | undefined;
  return row ? rowToMessage(row) : null;
}

export function getMessageByProviderId(
  workspaceId: string,
  providerMessageId: string,
): EmailMessage | null {
  ensureEmailEngineReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "email_message"
       WHERE "workspaceId" = ? AND "providerMessageId" = ?
       LIMIT 1`,
    )
    .get(workspaceId, providerMessageId) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToMessage(row) : null;
}

export function listMessages(
  workspaceId: string,
  filters: EmailListFilters = {},
): EmailMessage[] {
  ensureEmailEngineReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.q) {
    clauses.push(
      `("toEmail" LIKE ? ESCAPE '\\' OR "subject" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.kind) {
    clauses.push(`"kind" = ?`);
    params.push(filters.kind);
  }
  if (filters.campaignId) {
    clauses.push(`"campaignId" = ?`);
    params.push(filters.campaignId);
  }
  if (filters.contactId) {
    clauses.push(`"contactId" = ?`);
    params.push(filters.contactId);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "email_message"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToMessage);
}

export function createMessage(input: {
  workspaceId: string;
  contactId?: string | null;
  templateId?: string | null;
  campaignId?: string | null;
  kind?: EmailMessageKind;
  provider?: EmailProvider | null;
  toEmail: string;
  toName?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
  subject: string;
  html?: string | null;
  text?: string | null;
  status?: EmailMessageStatus;
  providerMessageId?: string | null;
  trackingToken?: string | null;
  errorMessage?: string | null;
  raw?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): EmailMessage {
  ensureEmailEngineReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "email_message" (
        "id", "workspaceId", "contactId", "templateId", "campaignId", "kind",
        "provider", "toEmail", "toName", "fromEmail", "fromName", "replyTo",
        "subject", "html", "text", "status", "providerMessageId", "trackingToken",
        "errorMessage", "openCount", "clickCount", "sentAt", "deliveredAt",
        "openedAt", "clickedAt", "bouncedAt", "rawJson", "metadataJson",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      asStringOrNull(input.contactId),
      asStringOrNull(input.templateId),
      asStringOrNull(input.campaignId),
      input.kind || "transactional",
      input.provider || null,
      normalizeEmail(input.toEmail),
      asStringOrNull(input.toName),
      asStringOrNull(input.fromEmail),
      asStringOrNull(input.fromName),
      asStringOrNull(input.replyTo),
      input.subject,
      asStringOrNull(input.html),
      asStringOrNull(input.text),
      input.status || "queued",
      asStringOrNull(input.providerMessageId),
      asStringOrNull(input.trackingToken),
      asStringOrNull(input.errorMessage),
      JSON.stringify(input.raw ?? {}),
      JSON.stringify(input.metadata ?? {}),
      timestamp,
      timestamp,
    );
  return getMessageById(id)!;
}

export function updateMessage(
  id: string,
  workspaceId: string,
  input: Partial<{
    status: EmailMessageStatus;
    providerMessageId: string | null;
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
    html: string | null;
    text: string | null;
  }>,
): EmailMessage {
  const existing = getMessageById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Message not found.");
  }

  sqlite
    .prepare(
      `UPDATE "email_message" SET
        "status" = ?, "providerMessageId" = ?, "errorMessage" = ?,
        "openCount" = ?, "clickCount" = ?, "sentAt" = ?, "deliveredAt" = ?,
        "openedAt" = ?, "clickedAt" = ?, "bouncedAt" = ?, "rawJson" = ?,
        "metadataJson" = ?, "html" = ?, "text" = ?, "updatedAt" = ?
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
      input.openCount ?? existing.openCount,
      input.clickCount ?? existing.clickCount,
      input.sentAt !== undefined
        ? asStringOrNull(input.sentAt)
        : existing.sentAt,
      input.deliveredAt !== undefined
        ? asStringOrNull(input.deliveredAt)
        : existing.deliveredAt,
      input.openedAt !== undefined
        ? asStringOrNull(input.openedAt)
        : existing.openedAt,
      input.clickedAt !== undefined
        ? asStringOrNull(input.clickedAt)
        : existing.clickedAt,
      input.bouncedAt !== undefined
        ? asStringOrNull(input.bouncedAt)
        : existing.bouncedAt,
      JSON.stringify(input.raw ?? existing.raw),
      JSON.stringify(input.metadata ?? existing.metadata),
      input.html !== undefined ? asStringOrNull(input.html) : existing.html,
      input.text !== undefined ? asStringOrNull(input.text) : existing.text,
      nowIso(),
      id,
      workspaceId,
    );
  return getMessageById(id)!;
}

export function getCampaignById(id: string): EmailCampaign | null {
  ensureEmailEngineReady();
  const row = sqlite
    .prepare(`SELECT * FROM "email_campaign" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToCampaign(row) : null;
}

export function listCampaigns(
  workspaceId: string,
  filters: EmailListFilters = {},
): EmailCampaign[] {
  ensureEmailEngineReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.q) {
    clauses.push(
      `("name" LIKE ? ESCAPE '\\' OR "subject" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
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
      `SELECT * FROM "email_campaign"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToCampaign);
}

export function createCampaign(input: {
  workspaceId: string;
  name: string;
  templateId?: string | null;
  subject: string;
  html?: string | null;
  text?: string | null;
  status?: EmailCampaignStatus;
  scheduledAt?: string | null;
  createdByUserId?: string | null;
  metadata?: Record<string, unknown>;
  recipients: Array<{
    email: string;
    name?: string | null;
    contactId?: string | null;
  }>;
}): EmailCampaign {
  ensureEmailEngineReady();
  const id = randomUUID();
  const timestamp = nowIso();

  sqlite
    .prepare(
      `INSERT INTO "email_campaign" (
        "id", "workspaceId", "name", "templateId", "subject", "html", "text",
        "status", "totalRecipients", "sentCount", "failedCount", "openCount",
        "clickCount", "bounceCount", "scheduledAt", "startedAt", "completedAt",
        "createdByUserId", "metadataJson", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, NULL, NULL, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.name.trim(),
      asStringOrNull(input.templateId),
      input.subject.trim(),
      asStringOrNull(input.html),
      asStringOrNull(input.text),
      input.status || "draft",
      input.recipients.length,
      asStringOrNull(input.scheduledAt),
      asStringOrNull(input.createdByUserId),
      JSON.stringify(input.metadata ?? {}),
      timestamp,
      timestamp,
    );

  const insertRecipient = sqlite.prepare(
    `INSERT INTO "email_campaign_recipient" (
      "id", "campaignId", "workspaceId", "contactId", "email", "name",
      "messageId", "status", "providerMessageId", "errorMessage", "sentAt",
      "createdAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'pending', NULL, NULL, NULL, ?, ?)`,
  );

  for (const recipient of input.recipients) {
    const email = normalizeEmail(recipient.email);
    if (!isValidEmail(email)) continue;
    insertRecipient.run(
      randomUUID(),
      id,
      input.workspaceId,
      asStringOrNull(recipient.contactId),
      email,
      asStringOrNull(recipient.name),
      timestamp,
      timestamp,
    );
  }

  return getCampaignById(id)!;
}

export function updateCampaign(
  id: string,
  workspaceId: string,
  input: Partial<{
    status: EmailCampaignStatus;
    sentCount: number;
    failedCount: number;
    openCount: number;
    clickCount: number;
    bounceCount: number;
    startedAt: string | null;
    completedAt: string | null;
    metadata: Record<string, unknown>;
  }>,
): EmailCampaign {
  const existing = getCampaignById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Campaign not found.");
  }

  sqlite
    .prepare(
      `UPDATE "email_campaign" SET
        "status" = ?, "sentCount" = ?, "failedCount" = ?, "openCount" = ?,
        "clickCount" = ?, "bounceCount" = ?, "startedAt" = ?, "completedAt" = ?,
        "metadataJson" = ?, "updatedAt" = ?
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      input.status ?? existing.status,
      input.sentCount ?? existing.sentCount,
      input.failedCount ?? existing.failedCount,
      input.openCount ?? existing.openCount,
      input.clickCount ?? existing.clickCount,
      input.bounceCount ?? existing.bounceCount,
      input.startedAt !== undefined
        ? asStringOrNull(input.startedAt)
        : existing.startedAt,
      input.completedAt !== undefined
        ? asStringOrNull(input.completedAt)
        : existing.completedAt,
      JSON.stringify(input.metadata ?? existing.metadata),
      nowIso(),
      id,
      workspaceId,
    );
  return getCampaignById(id)!;
}

export function listCampaignRecipients(
  campaignId: string,
  workspaceId: string,
): EmailCampaignRecipient[] {
  ensureEmailEngineReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "email_campaign_recipient"
       WHERE "campaignId" = ? AND "workspaceId" = ?
       ORDER BY "createdAt" ASC`,
    )
    .all(campaignId, workspaceId) as Record<string, unknown>[];
  return rows.map(rowToCampaignRecipient);
}

export function updateCampaignRecipient(
  id: string,
  workspaceId: string,
  input: Partial<{
    status: EmailCampaignRecipientStatus;
    messageId: string | null;
    providerMessageId: string | null;
    errorMessage: string | null;
    sentAt: string | null;
  }>,
): EmailCampaignRecipient {
  ensureEmailEngineReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "email_campaign_recipient" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .get(id, workspaceId) as Record<string, unknown> | undefined;
  if (!row) throw new Error("Campaign recipient not found.");
  const existing = rowToCampaignRecipient(row);

  sqlite
    .prepare(
      `UPDATE "email_campaign_recipient" SET
        "status" = ?, "messageId" = ?, "providerMessageId" = ?,
        "errorMessage" = ?, "sentAt" = ?, "updatedAt" = ?
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      input.status ?? existing.status,
      input.messageId !== undefined
        ? asStringOrNull(input.messageId)
        : existing.messageId,
      input.providerMessageId !== undefined
        ? asStringOrNull(input.providerMessageId)
        : existing.providerMessageId,
      input.errorMessage !== undefined
        ? asStringOrNull(input.errorMessage)
        : existing.errorMessage,
      input.sentAt !== undefined
        ? asStringOrNull(input.sentAt)
        : existing.sentAt,
      nowIso(),
      id,
      workspaceId,
    );

  return rowToCampaignRecipient(
    sqlite
      .prepare(`SELECT * FROM "email_campaign_recipient" WHERE "id" = ?`)
      .get(id) as Record<string, unknown>,
  );
}

export function createEmailLog(input: {
  workspaceId: string;
  operation: string;
  status?: EmailLogStatus;
  provider?: EmailProvider | null;
  email?: string | null;
  messageId?: string | null;
  campaignId?: string | null;
  providerMessageId?: string | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
  requestSummary?: string | null;
  responseSummary?: string | null;
  metadata?: Record<string, unknown>;
}): EmailLog {
  ensureEmailEngineReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "email_log" (
        "id", "workspaceId", "operation", "status", "provider", "email",
        "messageId", "campaignId", "providerMessageId", "latencyMs",
        "errorMessage", "requestSummary", "responseSummary", "metadataJson",
        "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.operation,
      input.status || "success",
      input.provider || null,
      asStringOrNull(input.email),
      asStringOrNull(input.messageId),
      asStringOrNull(input.campaignId),
      asStringOrNull(input.providerMessageId),
      input.latencyMs ?? null,
      asStringOrNull(input.errorMessage),
      asStringOrNull(input.requestSummary),
      asStringOrNull(input.responseSummary),
      JSON.stringify(input.metadata ?? {}),
      timestamp,
    );
  return rowToLog(
    sqlite
      .prepare(`SELECT * FROM "email_log" WHERE "id" = ?`)
      .get(id) as Record<string, unknown>,
  );
}

export function listEmailLogs(
  workspaceId: string,
  filters: EmailListFilters = {},
): EmailLog[] {
  ensureEmailEngineReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.q) {
    clauses.push(
      `("operation" LIKE ? ESCAPE '\\' OR "email" LIKE ? ESCAPE '\\' OR "requestSummary" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern);
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
      `SELECT * FROM "email_log"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToLog);
}

export function createEmailEvent(input: {
  workspaceId: string;
  messageId?: string | null;
  campaignId?: string | null;
  contactId?: string | null;
  type: EmailEventType;
  email?: string | null;
  url?: string | null;
  providerMessageId?: string | null;
  userAgent?: string | null;
  ipHash?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}): EmailEvent {
  ensureEmailEngineReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "email_event" (
        "id", "workspaceId", "messageId", "campaignId", "contactId", "type",
        "email", "url", "providerMessageId", "userAgent", "ipHash",
        "metadataJson", "occurredAt", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      asStringOrNull(input.messageId),
      asStringOrNull(input.campaignId),
      asStringOrNull(input.contactId),
      input.type,
      asStringOrNull(input.email),
      asStringOrNull(input.url),
      asStringOrNull(input.providerMessageId),
      asStringOrNull(input.userAgent),
      asStringOrNull(input.ipHash),
      JSON.stringify(input.metadata ?? {}),
      input.occurredAt || timestamp,
      timestamp,
    );
  return rowToEvent(
    sqlite
      .prepare(`SELECT * FROM "email_event" WHERE "id" = ?`)
      .get(id) as Record<string, unknown>,
  );
}

export function listEmailEvents(
  workspaceId: string,
  filters: EmailListFilters = {},
): EmailEvent[] {
  ensureEmailEngineReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.type) {
    clauses.push(`"type" = ?`);
    params.push(filters.type);
  }
  if (filters.campaignId) {
    clauses.push(`"campaignId" = ?`);
    params.push(filters.campaignId);
  }
  if (filters.q) {
    clauses.push(`("email" LIKE ? ESCAPE '\\' OR "url" LIKE ? ESCAPE '\\')`);
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "email_event"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "occurredAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

export function getEmailOverview(workspaceId: string): EmailOverviewStats {
  const settings = ensureWorkspaceEmail(workspaceId);
  const since = todayStartIso();

  const count = (sql: string, ...params: unknown[]) => {
    const row = sqlite.prepare(sql).get(...params) as { c: number };
    return Number(row?.c ?? 0);
  };

  return {
    isConnected: settings.isConnected,
    provider: settings.provider,
    fromEmail: settings.fromEmail,
    contacts: count(
      `SELECT COUNT(*) as c FROM "email_contact" WHERE "workspaceId" = ?`,
      workspaceId,
    ),
    templates: count(
      `SELECT COUNT(*) as c FROM "email_template" WHERE "workspaceId" = ?`,
      workspaceId,
    ),
    messagesToday: count(
      `SELECT COUNT(*) as c FROM "email_message"
       WHERE "workspaceId" = ? AND "createdAt" >= ?`,
      workspaceId,
      since,
    ),
    campaignsActive: count(
      `SELECT COUNT(*) as c FROM "email_campaign"
       WHERE "workspaceId" = ? AND "status" IN ('draft', 'scheduled', 'sending')`,
      workspaceId,
    ),
    opensToday: count(
      `SELECT COUNT(*) as c FROM "email_event"
       WHERE "workspaceId" = ? AND "type" = 'opened' AND "occurredAt" >= ?`,
      workspaceId,
      since,
    ),
    clicksToday: count(
      `SELECT COUNT(*) as c FROM "email_event"
       WHERE "workspaceId" = ? AND "type" = 'clicked' AND "occurredAt" >= ?`,
      workspaceId,
      since,
    ),
    bouncesToday: count(
      `SELECT COUNT(*) as c FROM "email_event"
       WHERE "workspaceId" = ? AND "type" = 'bounced' AND "occurredAt" >= ?`,
      workspaceId,
      since,
    ),
    logsToday: count(
      `SELECT COUNT(*) as c FROM "email_log"
       WHERE "workspaceId" = ? AND "createdAt" >= ?`,
      workspaceId,
      since,
    ),
    crmSyncEnabled: settings.crmSyncEnabled,
    automationEnabled: settings.automationEnabled,
    analyticsEnabled: settings.analyticsEnabled,
    openTrackingEnabled: settings.openTrackingEnabled,
    clickTrackingEnabled: settings.clickTrackingEnabled,
  };
}
