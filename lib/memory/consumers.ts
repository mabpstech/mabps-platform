import { expireMemories } from "@/lib/memory/expire";
import { mergeMemories, writeOrMergeMemory } from "@/lib/memory/merge";
import { ensureMemoryReady, writeMemory } from "@/lib/memory/repository";
import {
  formatMemoryContext,
  searchMemory,
} from "@/lib/memory/search";
import type {
  MemoryEntry,
  MemoryKind,
  MemorySearchHit,
  MemorySearchResult,
} from "@/lib/memory/types";

/**
 * Chatbot consumer — remember visitor facts + short-term conversation notes.
 */
export async function rememberForChatbot(input: {
  workspaceId: string;
  botId?: string | null;
  visitorKey?: string | null;
  conversationId?: string | null;
  text: string;
  facts?: Array<{ key: string; value: string; kind?: MemoryKind }>;
}): Promise<MemoryEntry[]> {
  ensureMemoryReady();
  const saved: MemoryEntry[] = [];

  for (const fact of input.facts || []) {
    const value = fact.value.trim();
    if (!value) continue;
    const kind = fact.kind || "profile";
    const entry = await writeMemory({
      workspaceId: input.workspaceId,
      kind,
      key: fact.key,
      content: value,
      scopeType: input.visitorKey ? "visitor" : "conversation",
      scopeId: input.visitorKey || input.conversationId || null,
      source: "chatbot",
      upsertByKey: true,
      metadata: {
        botId: input.botId || null,
        conversationId: input.conversationId || null,
      },
    });
    saved.push(entry);
  }

  const text = input.text.trim();
  if (text.length >= 12 && input.conversationId) {
    const short = await writeMemory({
      workspaceId: input.workspaceId,
      kind: "short_term",
      content: text.slice(0, 500),
      scopeType: "conversation",
      scopeId: input.conversationId,
      source: "chatbot",
      metadata: {
        botId: input.botId || null,
        visitorKey: input.visitorKey || null,
      },
    });
    saved.push(short);
  }

  return saved;
}

/**
 * Chatbot consumer — semantic retrieval across profile / long-term / business /
 * short-term conversation memory.
 */
export async function retrieveMemoryForChatbot(input: {
  workspaceId: string;
  query: string;
  visitorKey?: string | null;
  conversationId?: string | null;
  limit?: number;
}): Promise<{
  result: MemorySearchResult;
  context: string;
  hits: MemorySearchHit[];
}> {
  ensureMemoryReady();
  expireMemories({ workspaceId: input.workspaceId });

  const scopes: Array<{
    scopeType: "visitor" | "conversation" | "workspace";
    scopeId: string | null;
  }> = [{ scopeType: "workspace", scopeId: null }];

  if (input.visitorKey) {
    scopes.push({ scopeType: "visitor", scopeId: input.visitorKey });
  }
  if (input.conversationId) {
    scopes.push({ scopeType: "conversation", scopeId: input.conversationId });
  }

  const result = await searchMemory({
    workspaceId: input.workspaceId,
    query: input.query,
    limit: input.limit ?? 8,
    kinds: ["short_term", "long_term", "profile", "business"],
    scopes,
  });

  return {
    result,
    context: formatMemoryContext(result.hits),
    hits: result.hits,
  };
}

/**
 * Automation consumer — write a memory from a workflow step.
 */
export async function rememberForAutomation(input: {
  workspaceId: string;
  kind: MemoryKind;
  content: string;
  key?: string | null;
  scopeType?: MemoryEntry["scopeType"];
  scopeId?: string | null;
  importance?: number;
  metadata?: Record<string, unknown>;
  merge?: boolean;
}): Promise<{ ok: true; memory: MemoryEntry; merged: boolean }> {
  ensureMemoryReady();
  if (input.merge) {
    const result = await writeOrMergeMemory({
      workspaceId: input.workspaceId,
      kind: input.kind,
      content: input.content,
      key: input.key,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      importance: input.importance,
      source: "automation",
      metadata: input.metadata,
    });
    return { ok: true, memory: result.memory, merged: result.merged };
  }

  const memory = await writeMemory({
    workspaceId: input.workspaceId,
    kind: input.kind,
    content: input.content,
    key: input.key,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    importance: input.importance,
    source: "automation",
    metadata: input.metadata,
    upsertByKey: Boolean(input.key),
  });
  return { ok: true, memory, merged: false };
}

/**
 * Automation consumer — semantic memory search inside a workflow.
 */
export async function searchMemoryForAutomation(input: {
  workspaceId: string;
  query: string;
  limit?: number;
  kinds?: MemoryKind[];
  scopeType?: MemoryEntry["scopeType"];
  scopeId?: string | null;
}): Promise<{
  ok: true;
  query: string;
  context: string;
  hits: Array<{
    memoryId: string;
    kind: MemoryKind;
    key: string | null;
    content: string;
    score: number;
    importance: number;
  }>;
}> {
  ensureMemoryReady();
  expireMemories({ workspaceId: input.workspaceId });

  const result = await searchMemory({
    workspaceId: input.workspaceId,
    query: input.query,
    limit: input.limit ?? 5,
    kinds: input.kinds,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
  });

  return {
    ok: true,
    query: result.query,
    context: formatMemoryContext(result.hits),
    hits: result.hits.map((hit) => ({
      memoryId: hit.memory.id,
      kind: hit.memory.kind,
      key: hit.memory.key,
      content: hit.memory.content,
      score: hit.score,
      importance: hit.importance,
    })),
  };
}

/**
 * Automation consumer — merge memories by id.
 */
export async function mergeMemoryForAutomation(input: {
  workspaceId: string;
  memoryIds: string[];
}): Promise<{ ok: true; survivorId: string; mergedIds: string[] }> {
  ensureMemoryReady();
  const result = await mergeMemories(input);
  return {
    ok: true,
    survivorId: result.survivor.id,
    mergedIds: result.mergedIds,
  };
}
