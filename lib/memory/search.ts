import { getEmbeddingProvider } from "@/lib/knowledge/embeddings";
import { DEFAULT_SEARCH_LIMIT } from "@/lib/memory/defaults";
import {
  getMemoryById,
  listActiveMemoryIds,
  listMemories,
  touchMemoryAccess,
} from "@/lib/memory/repository";
import { computeRetrievalScore, isExpired } from "@/lib/memory/scoring";
import type {
  MemoryKind,
  MemoryScopeType,
  MemorySearchHit,
  MemorySearchResult,
} from "@/lib/memory/types";
import { searchMemoryVectors } from "@/lib/memory/vector";

function lexicalScore(query: string, content: string, key: string | null): number {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
  if (!tokens.length) return 0;
  const lowered = `${key || ""} ${content}`.toLowerCase();
  let score = 0;
  const seen = new Set<string>();
  for (const token of tokens) {
    if (!lowered.includes(token)) continue;
    score += seen.has(token) ? 0.15 : 1;
    seen.add(token);
  }
  return score;
}

export function formatMemoryContext(hits: MemorySearchHit[]): string {
  if (!hits.length) return "";
  return hits
    .map((hit) => {
      const label = hit.memory.key
        ? `${hit.memory.kind}/${hit.memory.key}`
        : hit.memory.kind;
      return `- [${label}] ${hit.memory.content}`;
    })
    .join("\n");
}

export async function searchMemory(input: {
  workspaceId: string;
  query: string;
  limit?: number;
  kinds?: MemoryKind[];
  scopeType?: MemoryScopeType;
  scopeId?: string | null;
  /** Extra scopes to include (e.g. visitor + conversation). */
  scopes?: Array<{ scopeType: MemoryScopeType; scopeId: string | null }>;
  embeddingProvider?: string | null;
  touchAccess?: boolean;
}): Promise<MemorySearchResult> {
  const query = input.query.trim();
  const limit = Math.min(
    Math.max(input.limit ?? DEFAULT_SEARCH_LIMIT, 1),
    50,
  );

  if (!query) {
    return {
      query,
      hits: [],
      provider: "none",
      model: "none",
      limit,
    };
  }

  let candidateIds: string[];

  if (input.scopes?.length) {
    const idSet = new Set<string>();
    for (const scope of input.scopes) {
      for (const id of listActiveMemoryIds(input.workspaceId, {
        kinds: input.kinds,
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
      })) {
        idSet.add(id);
      }
    }
    // Always include workspace-level business memories.
    for (const id of listActiveMemoryIds(input.workspaceId, {
      kinds: input.kinds?.length
        ? input.kinds.filter((k) => k === "business")
        : ["business"],
      scopeType: "workspace",
      scopeId: null,
    })) {
      idSet.add(id);
    }
    candidateIds = [...idSet];
  } else {
    candidateIds = listActiveMemoryIds(input.workspaceId, {
      kinds: input.kinds,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
    });
  }

  if (!candidateIds.length) {
    return {
      query,
      hits: [],
      provider: "none",
      model: "none",
      limit,
    };
  }

  const embedder = getEmbeddingProvider(input.embeddingProvider);
  const embedded = await embedder.embed([query]);
  const queryVector = embedded.vectors[0] || [];

  const vectorHits = await searchMemoryVectors({
    workspaceId: input.workspaceId,
    vector: queryVector,
    provider: embedded.provider,
    model: embedded.model,
    memoryIds: candidateIds,
    limit: limit * 6,
  });

  const scored = new Map<string, MemorySearchHit>();

  for (const hit of vectorHits) {
    const memory = getMemoryById(hit.memoryId);
    if (!memory || memory.workspaceId !== input.workspaceId) continue;
    if (memory.mergedIntoId || isExpired(memory)) continue;
    if (!candidateIds.includes(memory.id)) continue;
    const lexical = lexicalScore(query, memory.content, memory.key);
    const { score, recencyBoost } = computeRetrievalScore({
      semanticScore: hit.score,
      lexicalScore: lexical,
      importance: memory.importance,
      updatedAt: memory.updatedAt,
      accessCount: memory.accessCount,
    });
    scored.set(memory.id, {
      memory,
      score,
      semanticScore: hit.score,
      lexicalScore: lexical,
      importance: memory.importance,
      recencyBoost,
    });
  }

  if (!scored.size) {
    const memories = listMemories(input.workspaceId, {
      limit: 500,
      includeExpired: false,
      includeMerged: false,
      kind: input.kinds?.length === 1 ? input.kinds[0] : undefined,
    }).filter((memory) => candidateIds.includes(memory.id));

    for (const memory of memories) {
      const lexical = lexicalScore(query, memory.content, memory.key);
      if (lexical <= 0) continue;
      const { score, recencyBoost } = computeRetrievalScore({
        semanticScore: 0,
        lexicalScore: lexical,
        importance: memory.importance,
        updatedAt: memory.updatedAt,
        accessCount: memory.accessCount,
      });
      scored.set(memory.id, {
        memory,
        score,
        semanticScore: 0,
        lexicalScore: lexical,
        importance: memory.importance,
        recencyBoost,
      });
    }
  }

  const hits = [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (input.touchAccess !== false && hits.length) {
    touchMemoryAccess(
      hits.map((hit) => hit.memory.id),
      input.workspaceId,
    );
  }

  return {
    query,
    hits,
    provider: embedded.provider,
    model: embedded.model,
    limit,
  };
}
