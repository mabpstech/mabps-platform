import { randomBytes, randomUUID } from "node:crypto";
import { DEFAULT_SYSTEM_PROMPT, slugifyBotName } from "@/lib/chatbot/defaults";
import { chunkText, estimateTokens } from "@/lib/chatbot/knowledge/chunk";
import { extractKnowledgeText } from "@/lib/chatbot/knowledge/extract";
import {
  removeKnowledgeFile,
  saveKnowledgeFile,
} from "@/lib/chatbot/knowledge/storage";
import { migrateChatbotSchema } from "@/lib/chatbot/migrate";
import { defaultModelForProvider } from "@/lib/chatbot/providers";
import {
  decryptSecret,
  encryptSecret,
} from "@/lib/platform/secret-crypto";
import type {
  AiProviderId,
  BotStatus,
  ChannelStatus,
  ChatbotBot,
  ChatbotChannel,
  ChatbotConversation,
  ChatbotHandoff,
  ChatbotKnowledgeChunk,
  ChatbotKnowledgeSource,
  ChatbotListFilters,
  ChatbotMemory,
  ChatbotMessage,
  ChatbotOverviewStats,
  ChatbotProviderCredential,
  ChatbotProviderCredentialPublic,
  ChatbotWidget,
  ChatChannel,
  ConversationStatus,
  HandoffStatus,
  KnowledgeSourceStatus,
  KnowledgeSourceType,
  MessageRole,
  WidgetPosition,
} from "@/lib/chatbot/types";
import { sqlite } from "@/lib/db";

function nowIso(): string {
  return new Date().toISOString();
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function likePattern(q: string): string {
  return `%${q.replace(/[%_]/g, "\\$&")}%`;
}

function publicKey(): string {
  return `cb_${randomBytes(18).toString("hex")}`;
}

function boolFromInt(value: unknown): boolean {
  return Number(value) === 1;
}

export function ensureChatbotReady(): void {
  migrateChatbotSchema();
}

function rowToBot(row: Record<string, unknown>): ChatbotBot {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    slug: String(row.slug),
    description: asStringOrNull(row.description),
    systemPrompt: String(row.systemPrompt ?? ""),
    welcomeMessage: String(row.welcomeMessage ?? ""),
    fallbackMessage: String(row.fallbackMessage ?? ""),
    provider: String(row.provider) as AiProviderId,
    model: asStringOrNull(row.model),
    temperature: Number(row.temperature ?? 0.4),
    status: String(row.status) as BotStatus,
    leadCaptureEnabled: boolFromInt(row.leadCaptureEnabled),
    handoffEnabled: boolFromInt(row.handoffEnabled),
    memoryEnabled: boolFromInt(row.memoryEnabled),
    publicKey: String(row.publicKey),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToCredential(
  row: Record<string, unknown>,
): ChatbotProviderCredential {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    provider: String(row.provider) as AiProviderId,
    apiKey: decryptSecret(String(row.apiKey)),
    baseUrl: asStringOrNull(row.baseUrl),
    defaultModel: asStringOrNull(row.defaultModel),
    isActive: boolFromInt(row.isActive),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function toPublicCredential(
  credential: ChatbotProviderCredential,
): ChatbotProviderCredentialPublic {
  const { apiKey, ...rest } = credential;
  return {
    ...rest,
    hasApiKey: Boolean(apiKey),
    apiKeyLast4: apiKey ? apiKey.slice(-4) : null,
  };
}

function rowToWidget(row: Record<string, unknown>): ChatbotWidget {
  const origins = parseJson<string[] | null>(row.allowedOrigins, null);
  return {
    id: String(row.id),
    botId: String(row.botId),
    workspaceId: String(row.workspaceId),
    title: String(row.title),
    primaryColor: String(row.primaryColor),
    position: String(row.position) as WidgetPosition,
    launcherLabel: String(row.launcherLabel),
    allowedOrigins: origins,
    isEnabled: boolFromInt(row.isEnabled),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToChannel(row: Record<string, unknown>): ChatbotChannel {
  return {
    id: String(row.id),
    botId: String(row.botId),
    workspaceId: String(row.workspaceId),
    channel: String(row.channel) as ChatChannel,
    status: String(row.status) as ChannelStatus,
    config: parseJson<Record<string, unknown>>(row.configJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToSource(row: Record<string, unknown>): ChatbotKnowledgeSource {
  return {
    id: String(row.id),
    botId: String(row.botId),
    workspaceId: String(row.workspaceId),
    type: String(row.type) as KnowledgeSourceType,
    title: String(row.title),
    status: String(row.status) as KnowledgeSourceStatus,
    sourceUrl: asStringOrNull(row.sourceUrl),
    fileName: asStringOrNull(row.fileName),
    mimeType: asStringOrNull(row.mimeType),
    storagePath: asStringOrNull(row.storagePath),
    byteSize: Number(row.byteSize ?? 0),
    errorMessage: asStringOrNull(row.errorMessage),
    chunkCount: Number(row.chunkCount ?? 0),
    lastSyncedAt: asStringOrNull(row.lastSyncedAt),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToChunk(row: Record<string, unknown>): ChatbotKnowledgeChunk {
  return {
    id: String(row.id),
    sourceId: String(row.sourceId),
    botId: String(row.botId),
    workspaceId: String(row.workspaceId),
    chunkIndex: Number(row.chunkIndex ?? 0),
    content: String(row.content),
    tokenEstimate: Number(row.tokenEstimate ?? 0),
    createdAt: String(row.createdAt),
  };
}

function rowToConversation(row: Record<string, unknown>): ChatbotConversation {
  return {
    id: String(row.id),
    botId: String(row.botId),
    workspaceId: String(row.workspaceId),
    channel: String(row.channel) as ChatChannel,
    status: String(row.status) as ConversationStatus,
    visitorId: asStringOrNull(row.visitorId),
    visitorName: asStringOrNull(row.visitorName),
    visitorEmail: asStringOrNull(row.visitorEmail),
    visitorPhone: asStringOrNull(row.visitorPhone),
    externalThreadId: asStringOrNull(row.externalThreadId),
    crmLeadId: asStringOrNull(row.crmLeadId),
    assignedUserId: asStringOrNull(row.assignedUserId),
    handoffReason: asStringOrNull(row.handoffReason),
    metadata: parseJson<Record<string, unknown>>(row.metadataJson, {}),
    lastMessageAt: asStringOrNull(row.lastMessageAt),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToMessage(row: Record<string, unknown>): ChatbotMessage {
  return {
    id: String(row.id),
    conversationId: String(row.conversationId),
    botId: String(row.botId),
    workspaceId: String(row.workspaceId),
    role: String(row.role) as MessageRole,
    content: String(row.content),
    channel: String(row.channel) as ChatChannel,
    provider: asStringOrNull(row.provider) as AiProviderId | null,
    model: asStringOrNull(row.model),
    metadata: parseJson<Record<string, unknown>>(row.metadataJson, {}),
    createdAt: String(row.createdAt),
  };
}

function rowToMemory(row: Record<string, unknown>): ChatbotMemory {
  return {
    id: String(row.id),
    botId: String(row.botId),
    workspaceId: String(row.workspaceId),
    visitorKey: String(row.visitorKey),
    key: String(row.key),
    value: String(row.value),
    source: String(row.source),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToHandoff(row: Record<string, unknown>): ChatbotHandoff {
  return {
    id: String(row.id),
    conversationId: String(row.conversationId),
    botId: String(row.botId),
    workspaceId: String(row.workspaceId),
    status: String(row.status) as HandoffStatus,
    reason: asStringOrNull(row.reason),
    requestedAt: String(row.requestedAt),
    claimedByUserId: asStringOrNull(row.claimedByUserId),
    claimedAt: asStringOrNull(row.claimedAt),
    resolvedAt: asStringOrNull(row.resolvedAt),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function uniqueSlug(workspaceId: string, base: string): string {
  let slug = slugifyBotName(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const existing = sqlite
      .prepare(
        `SELECT "id" FROM "chatbot_bot" WHERE "workspaceId" = ? AND "slug" = ?`,
      )
      .get(workspaceId, candidate);
    if (!existing) return candidate;
    attempt += 1;
  }
}

export function ensureWorkspaceChatbot(workspaceId: string): ChatbotBot {
  ensureChatbotReady();
  const existing = listBots(workspaceId)[0];
  if (existing) return existing;
  return createBot({
    workspaceId,
    name: "Main assistant",
    description: "Default workspace chatbot",
    status: "active",
  });
}

export function getChatbotOverview(workspaceId: string): ChatbotOverviewStats {
  ensureChatbotReady();
  const bots = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "chatbot_bot" WHERE "workspaceId" = ?`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const activeBots = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "chatbot_bot" WHERE "workspaceId" = ? AND "status" = 'active'`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const knowledgeSources = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "chatbot_knowledge_source" WHERE "workspaceId" = ?`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const readySources = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "chatbot_knowledge_source" WHERE "workspaceId" = ? AND "status" = 'ready'`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const conversations = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "chatbot_conversation" WHERE "workspaceId" = ?`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const openHandoffs = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "chatbot_handoff" WHERE "workspaceId" = ? AND "status" IN ('requested', 'claimed')`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const leadsCaptured = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "chatbot_conversation" WHERE "workspaceId" = ? AND "crmLeadId" IS NOT NULL`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const messagesToday = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "chatbot_message" WHERE "workspaceId" = ? AND "createdAt" >= ?`,
        )
        .get(workspaceId, dayStart.toISOString()) as { c: number }
    ).c,
  );

  return {
    bots,
    activeBots,
    knowledgeSources,
    readySources,
    conversations,
    openHandoffs,
    leadsCaptured,
    messagesToday,
  };
}

export function listBots(workspaceId: string): ChatbotBot[] {
  ensureChatbotReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "chatbot_bot" WHERE "workspaceId" = ? ORDER BY "createdAt" ASC`,
    )
    .all(workspaceId) as Record<string, unknown>[];
  return rows.map(rowToBot);
}

export function getBotById(id: string): ChatbotBot | null {
  ensureChatbotReady();
  const row = sqlite
    .prepare(`SELECT * FROM "chatbot_bot" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToBot(row) : null;
}

export function getBotByPublicKey(publicKeyValue: string): ChatbotBot | null {
  ensureChatbotReady();
  const row = sqlite
    .prepare(`SELECT * FROM "chatbot_bot" WHERE "publicKey" = ?`)
    .get(publicKeyValue) as Record<string, unknown> | undefined;
  return row ? rowToBot(row) : null;
}

export function createBot(input: {
  workspaceId: string;
  name: string;
  description?: string | null;
  systemPrompt?: string;
  welcomeMessage?: string;
  fallbackMessage?: string;
  provider?: AiProviderId;
  model?: string | null;
  temperature?: number;
  status?: BotStatus;
}): ChatbotBot {
  ensureChatbotReady();
  const name = input.name.trim();
  if (!name) throw new Error("Bot name is required.");

  const id = randomUUID();
  const timestamp = nowIso();
  const provider = input.provider ?? "openai";
  const slug = uniqueSlug(input.workspaceId, name);

  sqlite
    .prepare(
      `INSERT INTO "chatbot_bot" (
        "id", "workspaceId", "name", "slug", "description", "systemPrompt",
        "welcomeMessage", "fallbackMessage", "provider", "model", "temperature",
        "status", "leadCaptureEnabled", "handoffEnabled", "memoryEnabled",
        "publicKey", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      name,
      slug,
      asStringOrNull(input.description),
      input.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
      input.welcomeMessage?.trim() || "Hi! How can I help you today?",
      input.fallbackMessage?.trim() ||
        "I am not sure about that. Would you like to talk to a human?",
      provider,
      asStringOrNull(input.model) || defaultModelForProvider(provider),
      typeof input.temperature === "number" ? input.temperature : 0.4,
      input.status ?? "draft",
      publicKey(),
      timestamp,
      timestamp,
    );

  ensureBotDefaults(id, input.workspaceId);
  return getBotById(id)!;
}

function ensureBotDefaults(botId: string, workspaceId: string) {
  const timestamp = nowIso();
  const widget = getWidgetByBotId(botId);
  if (!widget) {
    sqlite
      .prepare(
        `INSERT INTO "chatbot_widget" (
          "id", "botId", "workspaceId", "title", "primaryColor", "position",
          "launcherLabel", "allowedOrigins", "isEnabled", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, 'Chat with us', '#18181b', 'bottom-right', 'Chat', NULL, 1, ?, ?)`,
      )
      .run(randomUUID(), botId, workspaceId, timestamp, timestamp);
  }

  for (const channel of ["widget", "whatsapp", "api"] as ChatChannel[]) {
    const existing = getChannel(botId, channel);
    if (existing) continue;
    sqlite
      .prepare(
        `INSERT INTO "chatbot_channel" (
          "id", "botId", "workspaceId", "channel", "status", "configJson",
          "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, '{}', ?, ?)`,
      )
      .run(
        randomUUID(),
        botId,
        workspaceId,
        channel,
        channel === "widget" || channel === "api" ? "ready" : "disabled",
        timestamp,
        timestamp,
      );
  }
}

export function updateBot(
  id: string,
  workspaceId: string,
  input: Partial<{
    name: string;
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
  }>,
): ChatbotBot {
  ensureChatbotReady();
  const current = getBotById(id);
  if (!current || current.workspaceId !== workspaceId) {
    throw new Error("Bot not found.");
  }

  const timestamp = nowIso();
  const name = input.name?.trim() || current.name;
  const provider = input.provider ?? current.provider;

  sqlite
    .prepare(
      `UPDATE "chatbot_bot" SET
        "name" = ?, "description" = ?, "systemPrompt" = ?, "welcomeMessage" = ?,
        "fallbackMessage" = ?, "provider" = ?, "model" = ?, "temperature" = ?,
        "status" = ?, "leadCaptureEnabled" = ?, "handoffEnabled" = ?,
        "memoryEnabled" = ?, "updatedAt" = ?
      WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      name,
      input.description === undefined
        ? current.description
        : asStringOrNull(input.description),
      input.systemPrompt?.trim() || current.systemPrompt,
      input.welcomeMessage?.trim() || current.welcomeMessage,
      input.fallbackMessage?.trim() || current.fallbackMessage,
      provider,
      input.model === undefined
        ? current.model
        : asStringOrNull(input.model) || defaultModelForProvider(provider),
      typeof input.temperature === "number"
        ? input.temperature
        : current.temperature,
      input.status ?? current.status,
      input.leadCaptureEnabled === undefined
        ? current.leadCaptureEnabled
          ? 1
          : 0
        : input.leadCaptureEnabled
          ? 1
          : 0,
      input.handoffEnabled === undefined
        ? current.handoffEnabled
          ? 1
          : 0
        : input.handoffEnabled
          ? 1
          : 0,
      input.memoryEnabled === undefined
        ? current.memoryEnabled
          ? 1
          : 0
        : input.memoryEnabled
          ? 1
          : 0,
      timestamp,
      id,
      workspaceId,
    );

  return getBotById(id)!;
}

export function deleteBot(id: string, workspaceId: string): void {
  ensureChatbotReady();
  const bot = getBotById(id);
  if (!bot || bot.workspaceId !== workspaceId) {
    throw new Error("Bot not found.");
  }
  const sources = listKnowledgeSources(workspaceId, bot.id);
  for (const source of sources) {
    removeKnowledgeFile(source.storagePath, workspaceId);
  }
  sqlite
    .prepare(`DELETE FROM "chatbot_bot" WHERE "id" = ? AND "workspaceId" = ?`)
    .run(id, workspaceId);
}

export function listProviderCredentials(
  workspaceId: string,
): ChatbotProviderCredentialPublic[] {
  ensureChatbotReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "chatbot_provider_credential" WHERE "workspaceId" = ? ORDER BY "provider" ASC`,
    )
    .all(workspaceId) as Record<string, unknown>[];
  return rows.map((row) => toPublicCredential(rowToCredential(row)));
}

export function getProviderCredential(
  workspaceId: string,
  provider: AiProviderId,
): ChatbotProviderCredential | null {
  ensureChatbotReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "chatbot_provider_credential" WHERE "workspaceId" = ? AND "provider" = ?`,
    )
    .get(workspaceId, provider) as Record<string, unknown> | undefined;
  return row ? rowToCredential(row) : null;
}

export function upsertProviderCredential(input: {
  workspaceId: string;
  provider: AiProviderId;
  apiKey: string;
  baseUrl?: string | null;
  defaultModel?: string | null;
  isActive?: boolean;
}): ChatbotProviderCredentialPublic {
  ensureChatbotReady();
  const apiKey = input.apiKey.trim();
  if (!apiKey) throw new Error("API key is required.");
  const storedApiKey = encryptSecret(apiKey);
  const timestamp = nowIso();
  const existing = getProviderCredential(input.workspaceId, input.provider);

  if (existing) {
    sqlite
      .prepare(
        `UPDATE "chatbot_provider_credential" SET
          "apiKey" = ?, "baseUrl" = ?, "defaultModel" = ?, "isActive" = ?, "updatedAt" = ?
        WHERE "id" = ?`,
      )
      .run(
        storedApiKey,
        asStringOrNull(input.baseUrl),
        asStringOrNull(input.defaultModel) ||
          defaultModelForProvider(input.provider),
        input.isActive === false ? 0 : 1,
        timestamp,
        existing.id,
      );
  } else {
    sqlite
      .prepare(
        `INSERT INTO "chatbot_provider_credential" (
          "id", "workspaceId", "provider", "apiKey", "baseUrl", "defaultModel",
          "isActive", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        input.workspaceId,
        input.provider,
        storedApiKey,
        asStringOrNull(input.baseUrl),
        asStringOrNull(input.defaultModel) ||
          defaultModelForProvider(input.provider),
        input.isActive === false ? 0 : 1,
        timestamp,
        timestamp,
      );
  }

  return toPublicCredential(
    getProviderCredential(input.workspaceId, input.provider)!,
  );
}

export function deleteProviderCredential(
  workspaceId: string,
  provider: AiProviderId,
): void {
  ensureChatbotReady();
  sqlite
    .prepare(
      `DELETE FROM "chatbot_provider_credential" WHERE "workspaceId" = ? AND "provider" = ?`,
    )
    .run(workspaceId, provider);
}

export function getWidgetByBotId(botId: string): ChatbotWidget | null {
  ensureChatbotReady();
  const row = sqlite
    .prepare(`SELECT * FROM "chatbot_widget" WHERE "botId" = ?`)
    .get(botId) as Record<string, unknown> | undefined;
  return row ? rowToWidget(row) : null;
}

export function updateWidget(
  botId: string,
  workspaceId: string,
  input: Partial<{
    title: string;
    primaryColor: string;
    position: WidgetPosition;
    launcherLabel: string;
    allowedOrigins: string[] | null;
    isEnabled: boolean;
  }>,
): ChatbotWidget {
  ensureChatbotReady();
  ensureBotDefaults(botId, workspaceId);
  const current = getWidgetByBotId(botId);
  if (!current || current.workspaceId !== workspaceId) {
    throw new Error("Widget not found.");
  }

  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "chatbot_widget" SET
        "title" = ?, "primaryColor" = ?, "position" = ?, "launcherLabel" = ?,
        "allowedOrigins" = ?, "isEnabled" = ?, "updatedAt" = ?
      WHERE "id" = ?`,
    )
    .run(
      input.title?.trim() || current.title,
      input.primaryColor?.trim() || current.primaryColor,
      input.position || current.position,
      input.launcherLabel?.trim() || current.launcherLabel,
      input.allowedOrigins === undefined
        ? current.allowedOrigins
          ? JSON.stringify(current.allowedOrigins)
          : null
        : input.allowedOrigins
          ? JSON.stringify(input.allowedOrigins)
          : null,
      input.isEnabled === undefined
        ? current.isEnabled
          ? 1
          : 0
        : input.isEnabled
          ? 1
          : 0,
      timestamp,
      current.id,
    );

  return getWidgetByBotId(botId)!;
}

export function listChannels(botId: string): ChatbotChannel[] {
  ensureChatbotReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "chatbot_channel" WHERE "botId" = ? ORDER BY "channel" ASC`,
    )
    .all(botId) as Record<string, unknown>[];
  return rows.map(rowToChannel);
}

export function getChannel(
  botId: string,
  channel: ChatChannel,
): ChatbotChannel | null {
  ensureChatbotReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "chatbot_channel" WHERE "botId" = ? AND "channel" = ?`,
    )
    .get(botId, channel) as Record<string, unknown> | undefined;
  return row ? rowToChannel(row) : null;
}

export function updateChannel(
  botId: string,
  workspaceId: string,
  channel: ChatChannel,
  input: Partial<{ status: ChannelStatus; config: Record<string, unknown> }>,
): ChatbotChannel {
  ensureChatbotReady();
  ensureBotDefaults(botId, workspaceId);
  const current = getChannel(botId, channel);
  if (!current || current.workspaceId !== workspaceId) {
    throw new Error("Channel not found.");
  }
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "chatbot_channel" SET "status" = ?, "configJson" = ?, "updatedAt" = ? WHERE "id" = ?`,
    )
    .run(
      input.status ?? current.status,
      JSON.stringify(input.config ?? current.config),
      timestamp,
      current.id,
    );
  return getChannel(botId, channel)!;
}

export function listKnowledgeSources(
  workspaceId: string,
  botId?: string,
): ChatbotKnowledgeSource[] {
  ensureChatbotReady();
  if (botId) {
    const rows = sqlite
      .prepare(
        `SELECT * FROM "chatbot_knowledge_source" WHERE "workspaceId" = ? AND "botId" = ? ORDER BY "createdAt" DESC`,
      )
      .all(workspaceId, botId) as Record<string, unknown>[];
    return rows.map(rowToSource);
  }
  const rows = sqlite
    .prepare(
      `SELECT * FROM "chatbot_knowledge_source" WHERE "workspaceId" = ? ORDER BY "createdAt" DESC`,
    )
    .all(workspaceId) as Record<string, unknown>[];
  return rows.map(rowToSource);
}

export function getKnowledgeSourceById(
  id: string,
): ChatbotKnowledgeSource | null {
  ensureChatbotReady();
  const row = sqlite
    .prepare(`SELECT * FROM "chatbot_knowledge_source" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToSource(row) : null;
}

export function listKnowledgeChunks(botId: string): ChatbotKnowledgeChunk[] {
  ensureChatbotReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "chatbot_knowledge_chunk" WHERE "botId" = ? ORDER BY "sourceId", "chunkIndex"`,
    )
    .all(botId) as Record<string, unknown>[];
  return rows.map(rowToChunk);
}

function replaceChunks(input: {
  sourceId: string;
  botId: string;
  workspaceId: string;
  chunks: string[];
}) {
  sqlite
    .prepare(`DELETE FROM "chatbot_knowledge_chunk" WHERE "sourceId" = ?`)
    .run(input.sourceId);
  const insert = sqlite.prepare(
    `INSERT INTO "chatbot_knowledge_chunk" (
      "id", "sourceId", "botId", "workspaceId", "chunkIndex", "content",
      "tokenEstimate", "createdAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const timestamp = nowIso();
  input.chunks.forEach((content, chunkIndex) => {
    insert.run(
      randomUUID(),
      input.sourceId,
      input.botId,
      input.workspaceId,
      chunkIndex,
      content,
      estimateTokens(content),
      timestamp,
    );
  });
}

export async function processKnowledgeSource(
  sourceId: string,
): Promise<ChatbotKnowledgeSource> {
  ensureChatbotReady();
  const source = getKnowledgeSourceById(sourceId);
  if (!source) throw new Error("Knowledge source not found.");

  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "chatbot_knowledge_source" SET "status" = 'processing', "errorMessage" = NULL, "updatedAt" = ? WHERE "id" = ?`,
    )
    .run(timestamp, sourceId);

  try {
    const text = await extractKnowledgeText({
      type: source.type,
      storagePath: source.storagePath,
      sourceUrl: source.sourceUrl,
      workspaceId: source.workspaceId,
    });
    const chunks = chunkText(text);
    if (!chunks.length) throw new Error("No text content found to index.");
    replaceChunks({
      sourceId,
      botId: source.botId,
      workspaceId: source.workspaceId,
      chunks,
    });
    const doneAt = nowIso();
    sqlite
      .prepare(
        `UPDATE "chatbot_knowledge_source" SET
          "status" = 'ready', "chunkCount" = ?, "lastSyncedAt" = ?, "errorMessage" = NULL, "updatedAt" = ?
        WHERE "id" = ?`,
      )
      .run(chunks.length, doneAt, doneAt, sourceId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process source.";
    sqlite
      .prepare(
        `UPDATE "chatbot_knowledge_source" SET
          "status" = 'error', "errorMessage" = ?, "updatedAt" = ?
        WHERE "id" = ?`,
      )
      .run(message, nowIso(), sourceId);
  }

  return getKnowledgeSourceById(sourceId)!;
}

export async function createWebsiteKnowledgeSource(input: {
  workspaceId: string;
  botId: string;
  title: string;
  sourceUrl: string;
}): Promise<ChatbotKnowledgeSource> {
  ensureChatbotReady();
  const bot = getBotById(input.botId);
  if (!bot || bot.workspaceId !== input.workspaceId) {
    throw new Error("Bot not found.");
  }
  const url = input.sourceUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Website URL must start with http:// or https://.");
  }
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "chatbot_knowledge_source" (
        "id", "botId", "workspaceId", "type", "title", "status", "sourceUrl",
        "fileName", "mimeType", "storagePath", "byteSize", "errorMessage",
        "chunkCount", "lastSyncedAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, 'website', ?, 'pending', ?, NULL, 'text/html', NULL, 0, NULL, 0, NULL, ?, ?)`,
    )
    .run(
      id,
      input.botId,
      input.workspaceId,
      input.title.trim() || url,
      url,
      timestamp,
      timestamp,
    );
  return processKnowledgeSource(id);
}

export async function createFileKnowledgeSource(input: {
  workspaceId: string;
  botId: string;
  title: string;
  type: Exclude<KnowledgeSourceType, "website">;
  originalName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<ChatbotKnowledgeSource> {
  ensureChatbotReady();
  const bot = getBotById(input.botId);
  if (!bot || bot.workspaceId !== input.workspaceId) {
    throw new Error("Bot not found.");
  }
  if (input.bytes.length <= 0 || input.bytes.length > 12 * 1024 * 1024) {
    throw new Error("File must be between 1 byte and 12 MB.");
  }

  const saved = saveKnowledgeFile({
    workspaceId: input.workspaceId,
    botId: input.botId,
    originalName: input.originalName,
    bytes: input.bytes,
  });

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "chatbot_knowledge_source" (
        "id", "botId", "workspaceId", "type", "title", "status", "sourceUrl",
        "fileName", "mimeType", "storagePath", "byteSize", "errorMessage",
        "chunkCount", "lastSyncedAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?, ?, NULL, 0, NULL, ?, ?)`,
    )
    .run(
      id,
      input.botId,
      input.workspaceId,
      input.type,
      input.title.trim() || input.originalName,
      input.originalName,
      input.mimeType,
      saved.storagePath,
      input.bytes.length,
      timestamp,
      timestamp,
    );

  return processKnowledgeSource(id);
}

export function deleteKnowledgeSource(
  id: string,
  workspaceId: string,
): void {
  ensureChatbotReady();
  const source = getKnowledgeSourceById(id);
  if (!source || source.workspaceId !== workspaceId) {
    throw new Error("Knowledge source not found.");
  }
  removeKnowledgeFile(source.storagePath, workspaceId);
  sqlite
    .prepare(
      `DELETE FROM "chatbot_knowledge_source" WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(id, workspaceId);
}

export function listConversations(
  workspaceId: string,
  filters: ChatbotListFilters = {},
): ChatbotConversation[] {
  ensureChatbotReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.botId) {
    clauses.push(`"botId" = ?`);
    params.push(filters.botId);
  }
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.channel) {
    clauses.push(`"channel" = ?`);
    params.push(filters.channel);
  }
  if (filters.q) {
    clauses.push(
      `("visitorName" LIKE ? ESCAPE '\\' OR "visitorEmail" LIKE ? ESCAPE '\\' OR "visitorPhone" LIKE ? ESCAPE '\\' OR "id" LIKE ? ESCAPE '\\')`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern, pattern);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "chatbot_conversation"
       WHERE ${clauses.join(" AND ")}
       ORDER BY COALESCE("lastMessageAt", "createdAt") DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToConversation);
}

export function getConversationById(id: string): ChatbotConversation | null {
  ensureChatbotReady();
  const row = sqlite
    .prepare(`SELECT * FROM "chatbot_conversation" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToConversation(row) : null;
}

export function createConversation(input: {
  botId: string;
  workspaceId: string;
  channel?: ChatChannel;
  visitorId?: string | null;
  visitorName?: string | null;
  visitorEmail?: string | null;
  visitorPhone?: string | null;
  externalThreadId?: string | null;
  metadata?: Record<string, unknown>;
  /** SHA-256 hash of the visitor session secret (widget/public channels). */
  visitorSessionSecretHash?: string | null;
}): ChatbotConversation {
  ensureChatbotReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "chatbot_conversation" (
        "id", "botId", "workspaceId", "channel", "status", "visitorId",
        "visitorName", "visitorEmail", "visitorPhone", "externalThreadId",
        "crmLeadId", "assignedUserId", "handoffReason", "visitorSessionSecretHash",
        "metadataJson", "lastMessageAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, 'ai', ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.botId,
      input.workspaceId,
      input.channel ?? "widget",
      asStringOrNull(input.visitorId),
      asStringOrNull(input.visitorName),
      asStringOrNull(input.visitorEmail),
      asStringOrNull(input.visitorPhone),
      asStringOrNull(input.externalThreadId),
      asStringOrNull(input.visitorSessionSecretHash),
      JSON.stringify(input.metadata ?? {}),
      timestamp,
      timestamp,
      timestamp,
    );
  return getConversationById(id)!;
}

export function updateConversation(
  id: string,
  workspaceId: string,
  input: Partial<{
    status: ConversationStatus;
    visitorName: string | null;
    visitorEmail: string | null;
    visitorPhone: string | null;
    crmLeadId: string | null;
    assignedUserId: string | null;
    handoffReason: string | null;
    metadata: Record<string, unknown>;
    lastMessageAt: string | null;
  }>,
): ChatbotConversation {
  ensureChatbotReady();
  const current = getConversationById(id);
  if (!current || current.workspaceId !== workspaceId) {
    throw new Error("Conversation not found.");
  }
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "chatbot_conversation" SET
        "status" = ?, "visitorName" = ?, "visitorEmail" = ?, "visitorPhone" = ?,
        "crmLeadId" = ?, "assignedUserId" = ?, "handoffReason" = ?,
        "metadataJson" = ?, "lastMessageAt" = ?, "updatedAt" = ?
      WHERE "id" = ?`,
    )
    .run(
      input.status ?? current.status,
      input.visitorName === undefined
        ? current.visitorName
        : asStringOrNull(input.visitorName),
      input.visitorEmail === undefined
        ? current.visitorEmail
        : asStringOrNull(input.visitorEmail),
      input.visitorPhone === undefined
        ? current.visitorPhone
        : asStringOrNull(input.visitorPhone),
      input.crmLeadId === undefined
        ? current.crmLeadId
        : asStringOrNull(input.crmLeadId),
      input.assignedUserId === undefined
        ? current.assignedUserId
        : asStringOrNull(input.assignedUserId),
      input.handoffReason === undefined
        ? current.handoffReason
        : asStringOrNull(input.handoffReason),
      JSON.stringify(input.metadata ?? current.metadata),
      input.lastMessageAt === undefined
        ? current.lastMessageAt
        : asStringOrNull(input.lastMessageAt),
      timestamp,
      id,
    );
  return getConversationById(id)!;
}

export function listMessages(conversationId: string): ChatbotMessage[] {
  ensureChatbotReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "chatbot_message" WHERE "conversationId" = ? ORDER BY "createdAt" ASC`,
    )
    .all(conversationId) as Record<string, unknown>[];
  return rows.map(rowToMessage);
}

export function createMessage(input: {
  conversationId: string;
  botId: string;
  workspaceId: string;
  role: MessageRole;
  content: string;
  channel?: ChatChannel;
  provider?: AiProviderId | null;
  model?: string | null;
  metadata?: Record<string, unknown>;
}): ChatbotMessage {
  ensureChatbotReady();
  const content = input.content.trim();
  if (!content) throw new Error("Message content is required.");
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "chatbot_message" (
        "id", "conversationId", "botId", "workspaceId", "role", "content",
        "channel", "provider", "model", "metadataJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.conversationId,
      input.botId,
      input.workspaceId,
      input.role,
      content,
      input.channel ?? "widget",
      input.provider ?? null,
      input.model ?? null,
      JSON.stringify(input.metadata ?? {}),
      timestamp,
    );
  updateConversation(input.conversationId, input.workspaceId, {
    lastMessageAt: timestamp,
  });
  const row = sqlite
    .prepare(`SELECT * FROM "chatbot_message" WHERE "id" = ?`)
    .get(id) as Record<string, unknown>;
  return rowToMessage(row);
}

export function listMemory(
  botId: string,
  visitorKey: string,
): ChatbotMemory[] {
  ensureChatbotReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "chatbot_memory" WHERE "botId" = ? AND "visitorKey" = ? ORDER BY "updatedAt" DESC`,
    )
    .all(botId, visitorKey) as Record<string, unknown>[];
  return rows.map(rowToMemory);
}

export function upsertMemory(input: {
  botId: string;
  workspaceId: string;
  visitorKey: string;
  key: string;
  value: string;
  source?: string;
}): ChatbotMemory {
  ensureChatbotReady();
  const key = input.key.trim().toLowerCase();
  const value = input.value.trim();
  if (!key || !value) throw new Error("Memory key and value are required.");
  const timestamp = nowIso();
  const existing = sqlite
    .prepare(
      `SELECT * FROM "chatbot_memory" WHERE "botId" = ? AND "visitorKey" = ? AND "key" = ?`,
    )
    .get(input.botId, input.visitorKey, key) as
    | Record<string, unknown>
    | undefined;

  if (existing) {
    sqlite
      .prepare(
        `UPDATE "chatbot_memory" SET "value" = ?, "source" = ?, "updatedAt" = ? WHERE "id" = ?`,
      )
      .run(value, input.source ?? "conversation", timestamp, String(existing.id));
    return rowToMemory(
      sqlite
        .prepare(`SELECT * FROM "chatbot_memory" WHERE "id" = ?`)
        .get(String(existing.id)) as Record<string, unknown>,
    );
  }

  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "chatbot_memory" (
        "id", "botId", "workspaceId", "visitorKey", "key", "value", "source",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.botId,
      input.workspaceId,
      input.visitorKey,
      key,
      value,
      input.source ?? "conversation",
      timestamp,
      timestamp,
    );
  return rowToMemory(
    sqlite
      .prepare(`SELECT * FROM "chatbot_memory" WHERE "id" = ?`)
      .get(id) as Record<string, unknown>,
  );
}

export function getOpenHandoff(
  conversationId: string,
): ChatbotHandoff | null {
  ensureChatbotReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "chatbot_handoff"
       WHERE "conversationId" = ? AND "status" IN ('requested', 'claimed')
       ORDER BY "createdAt" DESC LIMIT 1`,
    )
    .get(conversationId) as Record<string, unknown> | undefined;
  return row ? rowToHandoff(row) : null;
}

export function listHandoffs(
  workspaceId: string,
  filters: ChatbotListFilters = {},
): ChatbotHandoff[] {
  ensureChatbotReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  } else {
    clauses.push(`"status" IN ('requested', 'claimed')`);
  }
  if (filters.botId) {
    clauses.push(`"botId" = ?`);
    params.push(filters.botId);
  }
  const limit = filters.limit ?? 100;
  params.push(limit);
  const rows = sqlite
    .prepare(
      `SELECT * FROM "chatbot_handoff"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "requestedAt" DESC
       LIMIT ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToHandoff);
}

export function createHandoff(input: {
  conversationId: string;
  botId: string;
  workspaceId: string;
  reason?: string | null;
}): ChatbotHandoff {
  ensureChatbotReady();
  const existing = getOpenHandoff(input.conversationId);
  if (existing) return existing;

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "chatbot_handoff" (
        "id", "conversationId", "botId", "workspaceId", "status", "reason",
        "requestedAt", "claimedByUserId", "claimedAt", "resolvedAt",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, 'requested', ?, ?, NULL, NULL, NULL, ?, ?)`,
    )
    .run(
      id,
      input.conversationId,
      input.botId,
      input.workspaceId,
      asStringOrNull(input.reason),
      timestamp,
      timestamp,
      timestamp,
    );
  updateConversation(input.conversationId, input.workspaceId, {
    status: "handoff_requested",
    handoffReason: input.reason ?? null,
  });
  return rowToHandoff(
    sqlite
      .prepare(`SELECT * FROM "chatbot_handoff" WHERE "id" = ?`)
      .get(id) as Record<string, unknown>,
  );
}

export function claimHandoff(
  handoffId: string,
  workspaceId: string,
  userId: string,
): ChatbotHandoff {
  ensureChatbotReady();
  const row = sqlite
    .prepare(`SELECT * FROM "chatbot_handoff" WHERE "id" = ?`)
    .get(handoffId) as Record<string, unknown> | undefined;
  if (!row || String(row.workspaceId) !== workspaceId) {
    throw new Error("Handoff not found.");
  }
  const handoff = rowToHandoff(row);
  if (handoff.status !== "requested" && handoff.status !== "claimed") {
    throw new Error("Handoff is no longer open.");
  }
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "chatbot_handoff" SET
        "status" = 'claimed', "claimedByUserId" = ?, "claimedAt" = ?, "updatedAt" = ?
      WHERE "id" = ?`,
    )
    .run(userId, timestamp, timestamp, handoffId);
  updateConversation(handoff.conversationId, workspaceId, {
    status: "human",
    assignedUserId: userId,
  });
  return rowToHandoff(
    sqlite
      .prepare(`SELECT * FROM "chatbot_handoff" WHERE "id" = ?`)
      .get(handoffId) as Record<string, unknown>,
  );
}

export function resolveHandoff(
  handoffId: string,
  workspaceId: string,
  resumeAi = true,
): ChatbotHandoff {
  ensureChatbotReady();
  const row = sqlite
    .prepare(`SELECT * FROM "chatbot_handoff" WHERE "id" = ?`)
    .get(handoffId) as Record<string, unknown> | undefined;
  if (!row || String(row.workspaceId) !== workspaceId) {
    throw new Error("Handoff not found.");
  }
  const handoff = rowToHandoff(row);
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "chatbot_handoff" SET "status" = 'resolved', "resolvedAt" = ?, "updatedAt" = ? WHERE "id" = ?`,
    )
    .run(timestamp, timestamp, handoffId);
  updateConversation(handoff.conversationId, workspaceId, {
    status: resumeAi ? "ai" : "closed",
  });
  return rowToHandoff(
    sqlite
      .prepare(`SELECT * FROM "chatbot_handoff" WHERE "id" = ?`)
      .get(handoffId) as Record<string, unknown>,
  );
}
