import { randomUUID } from "node:crypto";
import {
  currentPeriodKey,
  DEFAULT_AI_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_WORKSPACE_PROMPT,
  maskApiKey,
  slugifyPromptName,
} from "@/lib/ai/defaults";
import { migrateAiSchema } from "@/lib/ai/migrate";
import {
  decryptSecret,
  encryptSecret,
} from "@/lib/platform/secret-crypto";
import type {
  AiConversation,
  AiConversationStatus,
  AiListFilters,
  AiLog,
  AiLogStatus,
  AiMessage,
  AiMessageRole,
  AiOverviewStats,
  AiPrompt,
  AiPromptKind,
  AiProviderCredential,
  AiProviderId,
  AiSettings,
  AiUsageSummary,
} from "@/lib/ai/types";
import {
  AI_CONVERSATION_STATUSES,
  AI_LOG_STATUSES,
  AI_MESSAGE_ROLES,
  AI_PROMPT_KINDS,
  AI_PROVIDERS,
} from "@/lib/ai/types";
import { getWorkspaceLimits, getWorkspaceUsage } from "@/lib/billing/entitlements";
import { getProviderCredential as getChatbotProviderCredential } from "@/lib/chatbot/repository";
import { sqlite } from "@/lib/db";
import {
  CacheKeys,
  cacheGetOrSet,
  cacheSet,
  invalidateWorkspaceSettings,
} from "@/lib/platform/cache";

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

export function ensureAiReady(): void {
  migrateAiSchema();
}

function rowToSettings(row: Record<string, unknown>): AiSettings {
  const provider = String(row.defaultProvider || "openai");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    defaultProvider: AI_PROVIDERS.includes(provider as AiProviderId)
      ? (provider as AiProviderId)
      : "openai",
    defaultModel: (row.defaultModel as string | null) ?? null,
    temperature: Number(row.temperature ?? 0.4),
    streamingEnabled: Boolean(row.streamingEnabled),
    toolsEnabled: Boolean(row.toolsEnabled),
    systemPromptId: (row.systemPromptId as string | null) ?? null,
    maxToolRounds: Number(row.maxToolRounds ?? 3),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToCredential(row: Record<string, unknown>): AiProviderCredential {
  const provider = String(row.provider);
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    provider: AI_PROVIDERS.includes(provider as AiProviderId)
      ? (provider as AiProviderId)
      : "openai",
    apiKey: decryptSecret(String(row.apiKey)),
    baseUrl: (row.baseUrl as string | null) ?? null,
    defaultModel: (row.defaultModel as string | null) ?? null,
    isActive: Boolean(row.isActive),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export type AiProviderCredentialPublic = Omit<
  AiProviderCredential,
  "apiKey"
> & { apiKeyMasked: string };

function toPublicCredential(
  credential: AiProviderCredential,
): AiProviderCredentialPublic {
  const { apiKey, ...rest } = credential;
  return { ...rest, apiKeyMasked: maskApiKey(apiKey) };
}

function rowToPrompt(row: Record<string, unknown>): AiPrompt {
  const kind = String(row.kind);
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    slug: String(row.slug),
    name: String(row.name),
    kind: AI_PROMPT_KINDS.includes(kind as AiPromptKind)
      ? (kind as AiPromptKind)
      : "custom",
    content: String(row.content),
    description: (row.description as string | null) ?? null,
    isDefault: Boolean(row.isDefault),
    isActive: Boolean(row.isActive),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToConversation(row: Record<string, unknown>): AiConversation {
  const provider = row.provider ? String(row.provider) : null;
  const status = String(row.status || "active");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    userId: String(row.userId),
    title: String(row.title),
    provider:
      provider && AI_PROVIDERS.includes(provider as AiProviderId)
        ? (provider as AiProviderId)
        : null,
    model: (row.model as string | null) ?? null,
    status: AI_CONVERSATION_STATUSES.includes(status as AiConversationStatus)
      ? (status as AiConversationStatus)
      : "active",
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToMessage(row: Record<string, unknown>): AiMessage {
  const role = String(row.role);
  return {
    id: String(row.id),
    conversationId: String(row.conversationId),
    workspaceId: String(row.workspaceId),
    role: AI_MESSAGE_ROLES.includes(role as AiMessageRole)
      ? (role as AiMessageRole)
      : "user",
    content: String(row.content),
    toolName: (row.toolName as string | null) ?? null,
    toolCallId: (row.toolCallId as string | null) ?? null,
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
  };
}

function rowToLog(row: Record<string, unknown>): AiLog {
  const status = String(row.status || "success");
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    conversationId: (row.conversationId as string | null) ?? null,
    userId: (row.userId as string | null) ?? null,
    provider: String(row.provider),
    model: String(row.model),
    operation: String(row.operation || "chat"),
    status: AI_LOG_STATUSES.includes(status as AiLogStatus)
      ? (status as AiLogStatus)
      : "success",
    inputTokens: Number(row.inputTokens ?? 0),
    outputTokens: Number(row.outputTokens ?? 0),
    totalTokens: Number(row.totalTokens ?? 0),
    credits: Number(row.credits ?? 0),
    latencyMs:
      row.latencyMs === null || row.latencyMs === undefined
        ? null
        : Number(row.latencyMs),
    errorMessage: (row.errorMessage as string | null) ?? null,
    requestSummary: (row.requestSummary as string | null) ?? null,
    responseSummary: (row.responseSummary as string | null) ?? null,
    toolNames: parseJson(row.toolNamesJson, [] as string[]),
    metadata: parseJson(row.metadataJson, {}),
    createdAt: String(row.createdAt),
  };
}

function ensureUniquePromptSlug(
  workspaceId: string,
  base: string,
  excludeId?: string,
): string {
  let slug = base;
  let attempt = 1;
  while (true) {
    const row = sqlite
      .prepare(
        `SELECT "id" FROM "ai_prompt" WHERE "workspaceId" = ? AND "slug" = ?`,
      )
      .get(workspaceId, slug) as { id: string } | undefined;
    if (!row || row.id === excludeId) return slug;
    attempt += 1;
    slug = `${base}-${attempt}`.slice(0, 56);
  }
}

export function ensureWorkspaceAi(workspaceId: string): AiSettings {
  ensureAiReady();
  const existing = getAiSettings(workspaceId);
  if (existing) return existing;

  const timestamp = nowIso();
  const settingsId = randomUUID();
  const systemPromptId = randomUUID();
  const workspacePromptId = randomUUID();

  sqlite
    .prepare(
      `INSERT INTO "ai_prompt" (
        "id", "workspaceId", "slug", "name", "kind", "content", "description",
        "isDefault", "isActive", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      systemPromptId,
      workspaceId,
      "system-default",
      "Default system prompt",
      "system",
      DEFAULT_SYSTEM_PROMPT,
      "Core system instructions for the workspace AI assistant.",
      1,
      1,
      timestamp,
      timestamp,
    );

  sqlite
    .prepare(
      `INSERT INTO "ai_prompt" (
        "id", "workspaceId", "slug", "name", "kind", "content", "description",
        "isDefault", "isActive", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      workspacePromptId,
      workspaceId,
      "workspace-default",
      "Workspace prompt",
      "workspace",
      DEFAULT_WORKSPACE_PROMPT,
      "Workspace-specific tone and operating guidance.",
      1,
      1,
      timestamp,
      timestamp,
    );

  sqlite
    .prepare(
      `INSERT INTO "ai_settings" (
        "id", "workspaceId", "defaultProvider", "defaultModel", "temperature",
        "streamingEnabled", "toolsEnabled", "systemPromptId", "maxToolRounds",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      settingsId,
      workspaceId,
      "openai",
      DEFAULT_AI_MODEL.openai,
      0.4,
      1,
      1,
      systemPromptId,
      3,
      timestamp,
      timestamp,
    );

  invalidateWorkspaceSettings(workspaceId);
  return getAiSettings(workspaceId)!;
}

export function getAiSettings(workspaceId: string): AiSettings | null {
  return cacheGetOrSet(CacheKeys.aiSettings(workspaceId), () => {
    ensureAiReady();
    const row = sqlite
      .prepare(`SELECT * FROM "ai_settings" WHERE "workspaceId" = ?`)
      .get(workspaceId) as Record<string, unknown> | undefined;
    return row ? rowToSettings(row) : null;
  });
}

export function updateAiSettings(
  workspaceId: string,
  input: {
    defaultProvider?: AiProviderId;
    defaultModel?: string | null;
    temperature?: number;
    streamingEnabled?: boolean;
    toolsEnabled?: boolean;
    systemPromptId?: string | null;
    maxToolRounds?: number;
  },
): AiSettings {
  const current = ensureWorkspaceAi(workspaceId);
  const timestamp = nowIso();
  const provider = input.defaultProvider ?? current.defaultProvider;
  const model =
    input.defaultModel === undefined
      ? current.defaultModel
      : asStringOrNull(input.defaultModel);
  const temperature =
    typeof input.temperature === "number"
      ? Math.min(2, Math.max(0, input.temperature))
      : current.temperature;
  const maxToolRounds =
    typeof input.maxToolRounds === "number"
      ? Math.min(8, Math.max(0, Math.floor(input.maxToolRounds)))
      : current.maxToolRounds;

  if (input.systemPromptId) {
    const prompt = getPromptById(input.systemPromptId);
    if (!prompt || prompt.workspaceId !== workspaceId) {
      throw new Error("System prompt not found.");
    }
  }

  sqlite
    .prepare(
      `UPDATE "ai_settings" SET
        "defaultProvider" = ?, "defaultModel" = ?, "temperature" = ?,
        "streamingEnabled" = ?, "toolsEnabled" = ?, "systemPromptId" = ?,
        "maxToolRounds" = ?, "updatedAt" = ?
      WHERE "workspaceId" = ?`,
    )
    .run(
      provider,
      model || DEFAULT_AI_MODEL[provider],
      temperature,
      input.streamingEnabled === undefined
        ? current.streamingEnabled
          ? 1
          : 0
        : input.streamingEnabled
          ? 1
          : 0,
      input.toolsEnabled === undefined
        ? current.toolsEnabled
          ? 1
          : 0
        : input.toolsEnabled
          ? 1
          : 0,
      input.systemPromptId === undefined
        ? current.systemPromptId
        : input.systemPromptId,
      maxToolRounds,
      timestamp,
      workspaceId,
    );

  invalidateWorkspaceSettings(workspaceId);
  const settings = getAiSettings(workspaceId)!;
  cacheSet(CacheKeys.aiSettings(workspaceId), settings);
  return settings;
}

export function listProviderCredentials(
  workspaceId: string,
): AiProviderCredentialPublic[] {
  ensureAiReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "ai_provider_credential" WHERE "workspaceId" = ? ORDER BY "provider" ASC`,
    )
    .all(workspaceId) as Record<string, unknown>[];
  return rows.map((row) => toPublicCredential(rowToCredential(row)));
}

export function getProviderCredential(
  workspaceId: string,
  provider: AiProviderId,
): AiProviderCredential | null {
  ensureAiReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "ai_provider_credential" WHERE "workspaceId" = ? AND "provider" = ?`,
    )
    .get(workspaceId, provider) as Record<string, unknown> | undefined;
  return row ? rowToCredential(row) : null;
}

/** Prefer AI Assistant credentials; fall back to Chatbot provider keys. */
export function resolveProviderCredential(
  workspaceId: string,
  provider: AiProviderId,
): {
  apiKey: string;
  baseUrl: string | null;
  defaultModel: string | null;
  source: "ai" | "chatbot";
} | null {
  const aiCredential = getProviderCredential(workspaceId, provider);
  if (aiCredential?.isActive && aiCredential.apiKey) {
    return {
      apiKey: aiCredential.apiKey,
      baseUrl: aiCredential.baseUrl,
      defaultModel: aiCredential.defaultModel,
      source: "ai",
    };
  }

  try {
    const chatbotCredential = getChatbotProviderCredential(
      workspaceId,
      provider,
    );
    if (chatbotCredential?.isActive && chatbotCredential.apiKey) {
      return {
        apiKey: chatbotCredential.apiKey,
        baseUrl: chatbotCredential.baseUrl,
        defaultModel: chatbotCredential.defaultModel,
        source: "chatbot",
      };
    }
  } catch {
    // Chatbot schema may be unavailable in isolated tests.
  }

  return null;
}

export function upsertProviderCredential(input: {
  workspaceId: string;
  provider: AiProviderId;
  apiKey: string;
  baseUrl?: string | null;
  defaultModel?: string | null;
  isActive?: boolean;
}): AiProviderCredentialPublic {
  ensureAiReady();
  const timestamp = nowIso();
  const apiKey = input.apiKey.trim();
  if (!apiKey) throw new Error("API key is required.");

  const storedApiKey = encryptSecret(apiKey);
  const existing = getProviderCredential(input.workspaceId, input.provider);
  if (existing) {
    sqlite
      .prepare(
        `UPDATE "ai_provider_credential" SET
          "apiKey" = ?, "baseUrl" = ?, "defaultModel" = ?, "isActive" = ?, "updatedAt" = ?
        WHERE "id" = ?`,
      )
      .run(
        storedApiKey,
        asStringOrNull(input.baseUrl),
        asStringOrNull(input.defaultModel) || DEFAULT_AI_MODEL[input.provider],
        input.isActive === false ? 0 : 1,
        timestamp,
        existing.id,
      );
  } else {
    sqlite
      .prepare(
        `INSERT INTO "ai_provider_credential" (
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
        asStringOrNull(input.defaultModel) || DEFAULT_AI_MODEL[input.provider],
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
  ensureAiReady();
  sqlite
    .prepare(
      `DELETE FROM "ai_provider_credential" WHERE "workspaceId" = ? AND "provider" = ?`,
    )
    .run(workspaceId, provider);
}

export function listPrompts(
  workspaceId: string,
  filters: AiListFilters = {},
): AiPrompt[] {
  ensureAiReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.kind) {
    clauses.push(`"kind" = ?`);
    params.push(filters.kind);
  }
  if (filters.q) {
    clauses.push(`("name" LIKE ? ESCAPE '\\' OR "slug" LIKE ? ESCAPE '\\' OR "content" LIKE ? ESCAPE '\\')`);
    const like = likePattern(filters.q);
    params.push(like, like, like);
  }

  const limit = filters.limit ?? 200;
  const offset = filters.offset ?? 0;
  const rows = sqlite
    .prepare(
      `SELECT * FROM "ai_prompt"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "kind" ASC, "isDefault" DESC, "updatedAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Record<string, unknown>[];
  return rows.map(rowToPrompt);
}

export function getPromptById(id: string): AiPrompt | null {
  ensureAiReady();
  const row = sqlite
    .prepare(`SELECT * FROM "ai_prompt" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToPrompt(row) : null;
}

export function createPrompt(input: {
  workspaceId: string;
  name: string;
  kind?: AiPromptKind;
  content: string;
  description?: string | null;
  slug?: string;
  isDefault?: boolean;
  isActive?: boolean;
}): AiPrompt {
  ensureAiReady();
  const timestamp = nowIso();
  const id = randomUUID();
  const kind = input.kind || "custom";
  const slug = ensureUniquePromptSlug(
    input.workspaceId,
    slugifyPromptName(input.slug || input.name),
  );

  if (input.isDefault) {
    sqlite
      .prepare(
        `UPDATE "ai_prompt" SET "isDefault" = 0, "updatedAt" = ?
         WHERE "workspaceId" = ? AND "kind" = ?`,
      )
      .run(timestamp, input.workspaceId, kind);
  }

  sqlite
    .prepare(
      `INSERT INTO "ai_prompt" (
        "id", "workspaceId", "slug", "name", "kind", "content", "description",
        "isDefault", "isActive", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      slug,
      input.name.trim(),
      kind,
      input.content,
      asStringOrNull(input.description),
      input.isDefault ? 1 : 0,
      input.isActive === false ? 0 : 1,
      timestamp,
      timestamp,
    );

  return getPromptById(id)!;
}

export function updatePrompt(
  id: string,
  workspaceId: string,
  input: {
    name?: string;
    content?: string;
    description?: string | null;
    kind?: AiPromptKind;
    isDefault?: boolean;
    isActive?: boolean;
    slug?: string;
  },
): AiPrompt {
  const current = getPromptById(id);
  if (!current || current.workspaceId !== workspaceId) {
    throw new Error("Prompt not found.");
  }

  const timestamp = nowIso();
  const kind = input.kind || current.kind;
  const slug = input.slug
    ? ensureUniquePromptSlug(
        workspaceId,
        slugifyPromptName(input.slug),
        id,
      )
    : current.slug;

  if (input.isDefault) {
    sqlite
      .prepare(
        `UPDATE "ai_prompt" SET "isDefault" = 0, "updatedAt" = ?
         WHERE "workspaceId" = ? AND "kind" = ? AND "id" != ?`,
      )
      .run(timestamp, workspaceId, kind, id);
  }

  sqlite
    .prepare(
      `UPDATE "ai_prompt" SET
        "slug" = ?, "name" = ?, "kind" = ?, "content" = ?, "description" = ?,
        "isDefault" = ?, "isActive" = ?, "updatedAt" = ?
      WHERE "id" = ?`,
    )
    .run(
      slug,
      input.name?.trim() || current.name,
      kind,
      input.content ?? current.content,
      input.description === undefined
        ? current.description
        : asStringOrNull(input.description),
      input.isDefault === undefined
        ? current.isDefault
          ? 1
          : 0
        : input.isDefault
          ? 1
          : 0,
      input.isActive === undefined
        ? current.isActive
          ? 1
          : 0
        : input.isActive
          ? 1
          : 0,
      timestamp,
      id,
    );

  return getPromptById(id)!;
}

export function deletePrompt(id: string, workspaceId: string): void {
  const current = getPromptById(id);
  if (!current || current.workspaceId !== workspaceId) {
    throw new Error("Prompt not found.");
  }
  if (current.isDefault && current.kind === "system") {
    throw new Error("Cannot delete the default system prompt.");
  }
  sqlite.prepare(`DELETE FROM "ai_prompt" WHERE "id" = ?`).run(id);
}

export function resolveActivePrompts(workspaceId: string): {
  system: AiPrompt | null;
  workspace: AiPrompt | null;
} {
  ensureWorkspaceAi(workspaceId);
  const settings = getAiSettings(workspaceId);
  const systemFromSettings = settings?.systemPromptId
    ? getPromptById(settings.systemPromptId)
    : null;
  const prompts = listPrompts(workspaceId, { limit: 100 });
  const system =
    (systemFromSettings?.isActive ? systemFromSettings : null) ||
    prompts.find((prompt) => prompt.kind === "system" && prompt.isDefault) ||
    prompts.find((prompt) => prompt.kind === "system" && prompt.isActive) ||
    null;
  const workspace =
    prompts.find((prompt) => prompt.kind === "workspace" && prompt.isDefault) ||
    prompts.find((prompt) => prompt.kind === "workspace" && prompt.isActive) ||
    null;
  return { system, workspace };
}

export function listConversations(
  workspaceId: string,
  filters: AiListFilters & { userId?: string } = {},
): AiConversation[] {
  ensureAiReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.userId) {
    clauses.push(`"userId" = ?`);
    params.push(filters.userId);
  }
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.q) {
    clauses.push(`"title" LIKE ? ESCAPE '\\'`);
    params.push(likePattern(filters.q));
  }
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const rows = sqlite
    .prepare(
      `SELECT * FROM "ai_conversation"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "updatedAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Record<string, unknown>[];
  return rows.map(rowToConversation);
}

export function getConversationById(id: string): AiConversation | null {
  ensureAiReady();
  const row = sqlite
    .prepare(`SELECT * FROM "ai_conversation" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToConversation(row) : null;
}

export function createConversation(input: {
  workspaceId: string;
  userId: string;
  title?: string;
  provider?: AiProviderId | null;
  model?: string | null;
}): AiConversation {
  ensureAiReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "ai_conversation" (
        "id", "workspaceId", "userId", "title", "provider", "model", "status",
        "metadataJson", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.userId,
      input.title?.trim() || "New chat",
      input.provider ?? null,
      asStringOrNull(input.model),
      "active",
      "{}",
      timestamp,
      timestamp,
    );
  return getConversationById(id)!;
}

export function updateConversation(
  id: string,
  workspaceId: string,
  input: {
    title?: string;
    provider?: AiProviderId | null;
    model?: string | null;
    status?: AiConversationStatus;
    metadata?: Record<string, unknown>;
  },
): AiConversation {
  const current = getConversationById(id);
  if (!current || current.workspaceId !== workspaceId) {
    throw new Error("Conversation not found.");
  }
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "ai_conversation" SET
        "title" = ?, "provider" = ?, "model" = ?, "status" = ?,
        "metadataJson" = ?, "updatedAt" = ?
      WHERE "id" = ?`,
    )
    .run(
      input.title?.trim() || current.title,
      input.provider === undefined ? current.provider : input.provider,
      input.model === undefined
        ? current.model
        : asStringOrNull(input.model),
      input.status || current.status,
      JSON.stringify(input.metadata ?? current.metadata),
      timestamp,
      id,
    );
  return getConversationById(id)!;
}

export function deleteConversation(id: string, workspaceId: string): void {
  const current = getConversationById(id);
  if (!current || current.workspaceId !== workspaceId) {
    throw new Error("Conversation not found.");
  }
  sqlite.prepare(`DELETE FROM "ai_conversation" WHERE "id" = ?`).run(id);
}

export function listMessages(conversationId: string): AiMessage[] {
  ensureAiReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "ai_message"
       WHERE "conversationId" = ?
       ORDER BY "createdAt" ASC`,
    )
    .all(conversationId) as Record<string, unknown>[];
  return rows.map(rowToMessage);
}

export function createMessage(input: {
  conversationId: string;
  workspaceId: string;
  role: AiMessageRole;
  content: string;
  toolName?: string | null;
  toolCallId?: string | null;
  metadata?: Record<string, unknown>;
}): AiMessage {
  ensureAiReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "ai_message" (
        "id", "conversationId", "workspaceId", "role", "content",
        "toolName", "toolCallId", "metadataJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.conversationId,
      input.workspaceId,
      input.role,
      input.content,
      asStringOrNull(input.toolName),
      asStringOrNull(input.toolCallId),
      JSON.stringify(input.metadata ?? {}),
      timestamp,
    );
  sqlite
    .prepare(
      `UPDATE "ai_conversation" SET "updatedAt" = ? WHERE "id" = ?`,
    )
    .run(timestamp, input.conversationId);

  const row = sqlite
    .prepare(`SELECT * FROM "ai_message" WHERE "id" = ?`)
    .get(id) as Record<string, unknown>;
  return rowToMessage(row);
}

export function createAiLog(input: {
  workspaceId: string;
  conversationId?: string | null;
  userId?: string | null;
  provider: string;
  model: string;
  operation?: string;
  status?: AiLogStatus;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  credits?: number;
  latencyMs?: number | null;
  errorMessage?: string | null;
  requestSummary?: string | null;
  responseSummary?: string | null;
  toolNames?: string[];
  metadata?: Record<string, unknown>;
}): AiLog {
  ensureAiReady();
  const id = randomUUID();
  const timestamp = nowIso();
  const inputTokens = input.inputTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  const totalTokens = input.totalTokens ?? inputTokens + outputTokens;
  sqlite
    .prepare(
      `INSERT INTO "ai_log" (
        "id", "workspaceId", "conversationId", "userId", "provider", "model",
        "operation", "status", "inputTokens", "outputTokens", "totalTokens",
        "credits", "latencyMs", "errorMessage", "requestSummary",
        "responseSummary", "toolNamesJson", "metadataJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.conversationId ?? null,
      input.userId ?? null,
      input.provider,
      input.model,
      input.operation ?? "chat",
      input.status ?? "success",
      inputTokens,
      outputTokens,
      totalTokens,
      input.credits ?? 0,
      input.latencyMs ?? null,
      asStringOrNull(input.errorMessage),
      asStringOrNull(input.requestSummary),
      asStringOrNull(input.responseSummary),
      JSON.stringify(input.toolNames ?? []),
      JSON.stringify(input.metadata ?? {}),
      timestamp,
    );
  return getAiLogById(id)!;
}

export function getAiLogById(id: string): AiLog | null {
  ensureAiReady();
  const row = sqlite
    .prepare(`SELECT * FROM "ai_log" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToLog(row) : null;
}

export function listAiLogs(
  workspaceId: string,
  filters: AiListFilters = {},
): AiLog[] {
  ensureAiReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.provider) {
    clauses.push(`"provider" = ?`);
    params.push(filters.provider);
  }
  if (filters.q) {
    clauses.push(
      `("requestSummary" LIKE ? ESCAPE '\\' OR "responseSummary" LIKE ? ESCAPE '\\' OR "errorMessage" LIKE ? ESCAPE '\\' OR "model" LIKE ? ESCAPE '\\')`,
    );
    const like = likePattern(filters.q);
    params.push(like, like, like, like);
  }
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  const rows = sqlite
    .prepare(
      `SELECT * FROM "ai_log"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Record<string, unknown>[];
  return rows.map(rowToLog);
}

export function getAiUsageSummary(workspaceId: string): AiUsageSummary {
  ensureAiReady();
  const periodKey = currentPeriodKey();
  const periodStart = `${periodKey}-01T00:00:00.000Z`;
  const rows = sqlite
    .prepare(
      `SELECT * FROM "ai_log"
       WHERE "workspaceId" = ? AND "createdAt" >= ?`,
    )
    .all(workspaceId, periodStart) as Record<string, unknown>[];
  const logs = rows.map(rowToLog);

  const byProviderMap = new Map<
    string,
    { provider: string; requests: number; tokens: number; credits: number }
  >();
  const byModelMap = new Map<
    string,
    { model: string; requests: number; tokens: number }
  >();

  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let credits = 0;
  let successCount = 0;
  let failureCount = 0;

  for (const log of logs) {
    inputTokens += log.inputTokens;
    outputTokens += log.outputTokens;
    totalTokens += log.totalTokens;
    credits += log.credits;
    if (log.status === "success") successCount += 1;
    else failureCount += 1;

    const providerEntry = byProviderMap.get(log.provider) || {
      provider: log.provider,
      requests: 0,
      tokens: 0,
      credits: 0,
    };
    providerEntry.requests += 1;
    providerEntry.tokens += log.totalTokens;
    providerEntry.credits += log.credits;
    byProviderMap.set(log.provider, providerEntry);

    const modelEntry = byModelMap.get(log.model) || {
      model: log.model,
      requests: 0,
      tokens: 0,
    };
    modelEntry.requests += 1;
    modelEntry.tokens += log.totalTokens;
    byModelMap.set(log.model, modelEntry);
  }

  const usage = getWorkspaceUsage(workspaceId);
  const limits = getWorkspaceLimits(workspaceId);

  return {
    periodKey,
    requests: logs.length,
    successCount,
    failureCount,
    inputTokens,
    outputTokens,
    totalTokens,
    credits,
    billingCredits: usage.aiCredits,
    billingLimit: limits.aiCredits,
    byProvider: [...byProviderMap.values()].sort(
      (a, b) => b.requests - a.requests,
    ),
    byModel: [...byModelMap.values()].sort((a, b) => b.requests - a.requests),
  };
}

export function getAiOverview(workspaceId: string): AiOverviewStats {
  ensureAiReady();
  const settings = ensureWorkspaceAi(workspaceId);
  const periodStart = `${currentPeriodKey()}-01T00:00:00.000Z`;
  const today = new Date().toISOString().slice(0, 10);

  const conversations = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as count FROM "ai_conversation" WHERE "workspaceId" = ?`,
      )
      .get(workspaceId) as { count: number }
  ).count;
  const messages = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as count FROM "ai_message" WHERE "workspaceId" = ?`,
      )
      .get(workspaceId) as { count: number }
  ).count;
  const prompts = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as count FROM "ai_prompt" WHERE "workspaceId" = ? AND "isActive" = 1`,
      )
      .get(workspaceId) as { count: number }
  ).count;
  const activeProviders = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as count FROM "ai_provider_credential"
         WHERE "workspaceId" = ? AND "isActive" = 1`,
      )
      .get(workspaceId) as { count: number }
  ).count;
  const logsToday = (
    sqlite
      .prepare(
        `SELECT COUNT(*) as count FROM "ai_log"
         WHERE "workspaceId" = ? AND "createdAt" >= ?`,
      )
      .get(workspaceId, `${today}T00:00:00.000Z`) as { count: number }
  ).count;
  const periodStats = sqlite
    .prepare(
      `SELECT
         COUNT(*) as requests,
         SUM(CASE WHEN "status" = 'success' THEN 1 ELSE 0 END) as successes,
         SUM("credits") as credits
       FROM "ai_log"
       WHERE "workspaceId" = ? AND "createdAt" >= ?`,
    )
    .get(workspaceId, periodStart) as {
    requests: number;
    successes: number;
    credits: number | null;
  };

  const requests = Number(periodStats.requests ?? 0);
  const successes = Number(periodStats.successes ?? 0);

  return {
    conversations: Number(conversations ?? 0),
    messages: Number(messages ?? 0),
    prompts: Number(prompts ?? 0),
    activeProviders: Number(activeProviders ?? 0),
    logsToday: Number(logsToday ?? 0),
    creditsUsedPeriod: Number(periodStats.credits ?? 0),
    successRate: requests ? Math.round((successes / requests) * 100) : 100,
    defaultProvider: settings.defaultProvider,
    defaultModel: settings.defaultModel,
    toolsEnabled: settings.toolsEnabled,
    streamingEnabled: settings.streamingEnabled,
  };
}
