import { MERGE_SIMILARITY_THRESHOLD } from "@/lib/memory/defaults";
import { getEmbeddingProvider } from "@/lib/knowledge/embeddings";
import {
  getMemoryForWorkspace,
  markMerged,
  updateMemory,
  writeMemory,
} from "@/lib/memory/repository";
import { isExpired } from "@/lib/memory/scoring";
import type { MemoryEntry } from "@/lib/memory/types";
import { searchMemoryVectors } from "@/lib/memory/vector";

function mergeContent(a: string, b: string): string {
  const left = a.trim();
  const right = b.trim();
  if (!left) return right;
  if (!right) return left;
  if (left.toLowerCase().includes(right.toLowerCase())) return left;
  if (right.toLowerCase().includes(left.toLowerCase())) return right;
  return `${left}\n${right}`;
}

/**
 * Merge two (or more) memories into a survivor.
 * Prefer the higher-importance memory as the survivor.
 */
export async function mergeMemories(input: {
  workspaceId: string;
  memoryIds: string[];
}): Promise<{ survivor: MemoryEntry; mergedIds: string[] }> {
  const uniqueIds = [...new Set(input.memoryIds.filter(Boolean))];
  if (uniqueIds.length < 2) {
    throw new Error("At least two memory ids are required to merge.");
  }

  const memories = uniqueIds
    .map((id) => getMemoryForWorkspace(id, input.workspaceId))
    .filter((memory): memory is MemoryEntry => Boolean(memory));

  if (memories.length < 2) {
    throw new Error("One or more memories were not found.");
  }
  for (const memory of memories) {
    if (memory.mergedIntoId) {
      throw new Error(`Memory ${memory.id} was already merged.`);
    }
    if (isExpired(memory)) {
      throw new Error(`Memory ${memory.id} is expired.`);
    }
  }

  const kinds = new Set(memories.map((m) => m.kind));
  if (kinds.size > 1) {
    throw new Error("Can only merge memories of the same kind.");
  }

  const sorted = [...memories].sort((a, b) => {
    if (b.importance !== a.importance) return b.importance - a.importance;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
  const survivor = sorted[0]!;
  const sources = sorted.slice(1);

  let content = survivor.content;
  let importance = survivor.importance;
  const metadata = { ...survivor.metadata };
  const mergedFrom = [
    ...((Array.isArray(metadata.mergedFrom)
      ? metadata.mergedFrom
      : []) as string[]),
  ];

  for (const source of sources) {
    content = mergeContent(content, source.content);
    importance = Math.max(importance, source.importance);
    mergedFrom.push(source.id);
    if (source.key && !survivor.key) {
      // keep survivor key; nothing to do
    }
  }

  metadata.mergedFrom = [...new Set(mergedFrom)];
  metadata.mergeCount = Number(metadata.mergeCount || 0) + sources.length;

  const updated = await updateMemory(survivor.id, input.workspaceId, {
    content,
    importance,
    metadata,
    source: "merge",
  });

  markMerged(
    sources.map((m) => m.id),
    survivor.id,
    input.workspaceId,
  );

  return {
    survivor: updated,
    mergedIds: sources.map((m) => m.id),
  };
}

/**
 * Auto-merge near-duplicate active memories within a workspace (optional dry-run).
 */
export async function autoMergeSimilarMemories(input: {
  workspaceId: string;
  threshold?: number;
  limit?: number;
  dryRun?: boolean;
}): Promise<{
  merges: Array<{ survivorId: string; mergedIds: string[]; similarity: number }>;
}> {
  const threshold = input.threshold ?? MERGE_SIMILARITY_THRESHOLD;
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const embedder = getEmbeddingProvider();
  const { listMemories } = await import("@/lib/memory/repository");
  const memories = listMemories(input.workspaceId, {
    limit: 400,
    includeExpired: false,
    includeMerged: false,
  });

  const merges: Array<{
    survivorId: string;
    mergedIds: string[];
    similarity: number;
  }> = [];
  const consumed = new Set<string>();

  for (const memory of memories) {
    if (consumed.has(memory.id)) continue;
    if (merges.length >= limit) break;

    const embedded = await embedder.embed([memory.content]);
    const vector = embedded.vectors[0] || [];
    const hits = await searchMemoryVectors({
      workspaceId: input.workspaceId,
      vector,
      provider: embedded.provider,
      model: embedded.model,
      limit: 12,
    });

    const partners: Array<{ id: string; similarity: number }> = [];
    for (const hit of hits) {
      if (hit.memoryId === memory.id) continue;
      if (consumed.has(hit.memoryId)) continue;
      if (hit.score < threshold) continue;
      const other = getMemoryForWorkspace(hit.memoryId, input.workspaceId);
      if (!other || other.mergedIntoId || isExpired(other)) continue;
      if (other.kind !== memory.kind) continue;
      if (other.scopeType !== memory.scopeType) continue;
      if ((other.scopeId || null) !== (memory.scopeId || null)) continue;
      partners.push({ id: other.id, similarity: hit.score });
    }

    if (!partners.length) continue;

    const best = partners.sort((a, b) => b.similarity - a.similarity)[0]!;
    const pairIds = [memory.id, best.id];
    if (input.dryRun) {
      merges.push({
        survivorId: memory.id,
        mergedIds: [best.id],
        similarity: best.similarity,
      });
      consumed.add(memory.id);
      consumed.add(best.id);
      continue;
    }

    const result = await mergeMemories({
      workspaceId: input.workspaceId,
      memoryIds: pairIds,
    });
    merges.push({
      survivorId: result.survivor.id,
      mergedIds: result.mergedIds,
      similarity: best.similarity,
    });
    consumed.add(memory.id);
    consumed.add(best.id);
  }

  return { merges };
}

/** Convenience used when writing: merge into existing same-key memory if content is similar. */
export async function writeOrMergeMemory(input: {
  workspaceId: string;
  kind: MemoryEntry["kind"];
  content: string;
  scopeType?: MemoryEntry["scopeType"];
  scopeId?: string | null;
  key?: string | null;
  importance?: number;
  source?: string;
  metadata?: Record<string, unknown>;
  mergeThreshold?: number;
}): Promise<{ memory: MemoryEntry; merged: boolean }> {
  const created = await writeMemory({
    ...input,
    upsertByKey: Boolean(input.key),
  });

  if (!input.key) {
    const threshold = input.mergeThreshold ?? MERGE_SIMILARITY_THRESHOLD;
    const embedder = getEmbeddingProvider();
    const embedded = await embedder.embed([created.content]);
    const hits = await searchMemoryVectors({
      workspaceId: input.workspaceId,
      vector: embedded.vectors[0] || [],
      provider: embedded.provider,
      model: embedded.model,
      limit: 5,
    });

    for (const hit of hits) {
      if (hit.memoryId === created.id) continue;
      if (hit.score < threshold) continue;
      const other = getMemoryForWorkspace(hit.memoryId, input.workspaceId);
      if (!other || other.kind !== created.kind) continue;
      if (other.scopeType !== created.scopeType) continue;
      if ((other.scopeId || null) !== (created.scopeId || null)) continue;
      const result = await mergeMemories({
        workspaceId: input.workspaceId,
        memoryIds: [created.id, other.id],
      });
      return { memory: result.survivor, merged: true };
    }
  }

  return { memory: created, merged: false };
}

// Re-export for callers that import merge helpers together.
export { writeMemory };
