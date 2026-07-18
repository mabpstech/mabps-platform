import { getEmbeddingProvider } from "@/lib/knowledge/embeddings";
import {
  getChunkById,
  getSourceById,
  getVersionById,
  listActiveVersionIds,
  listChunksForVersions,
} from "@/lib/knowledge/repository";
import type { KbSearchHit, KbSearchResult } from "@/lib/knowledge/types";
import { getVectorStore } from "@/lib/knowledge/vector";

function lexicalScore(query: string, content: string): number {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
  if (!tokens.length) return 0;
  const lowered = content.toLowerCase();
  let score = 0;
  const seen = new Set<string>();
  for (const token of tokens) {
    if (!lowered.includes(token)) continue;
    score += seen.has(token) ? 0.15 : 1;
    seen.add(token);
  }
  return score;
}

export function formatKnowledgeContext(hits: KbSearchHit[]): string {
  if (!hits.length) return "";
  return hits
    .map((hit, index) => {
      const title = hit.sourceTitle || hit.sourceId;
      return `[Source ${index + 1}: ${title}]\n${hit.chunk.content}`;
    })
    .join("\n\n");
}

export async function searchKnowledge(input: {
  workspaceId: string;
  query: string;
  limit?: number;
  sourceIds?: string[];
  embeddingProvider?: string | null;
  vectorStore?: string | null;
}): Promise<KbSearchResult> {
  const query = input.query.trim();
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 25);
  if (!query) {
    return {
      query,
      hits: [],
      provider: "none",
      model: "none",
      limit,
    };
  }

  const versionIds = listActiveVersionIds(
    input.workspaceId,
    input.sourceIds,
  );
  if (!versionIds.length) {
    return {
      query,
      hits: [],
      provider: "none",
      model: "none",
      limit,
    };
  }

  const embedder = getEmbeddingProvider(input.embeddingProvider);
  const store = getVectorStore(input.vectorStore);
  const embedded = await embedder.embed([query]);
  const queryVector = embedded.vectors[0] || [];

  const vectorHits = await store.search({
    workspaceId: input.workspaceId,
    versionIds,
    vector: queryVector,
    provider: embedded.provider,
    model: embedded.model,
    limit: limit * 4,
  });

  const scored = new Map<string, KbSearchHit>();

  for (const hit of vectorHits) {
    const chunk = getChunkById(hit.record.chunkId);
    if (!chunk || chunk.workspaceId !== input.workspaceId) continue;
    const source = getSourceById(chunk.sourceId);
    if (!source || source.workspaceId !== input.workspaceId) continue;
    if (input.sourceIds?.length && !input.sourceIds.includes(source.id)) {
      continue;
    }
    const version = getVersionById(chunk.versionId);
    const lexical = lexicalScore(query, chunk.content);
    const score = hit.score * 0.85 + Math.min(lexical, 5) * 0.03;
    scored.set(chunk.id, {
      chunk,
      score,
      sourceId: source.id,
      sourceTitle: source.title,
      sourceType: source.type,
      version: version?.version ?? source.currentVersion,
    });
  }

  if (!scored.size) {
    const chunks = listChunksForVersions(input.workspaceId, versionIds);
    for (const chunk of chunks) {
      const score = lexicalScore(query, chunk.content);
      if (score <= 0) continue;
      const source = getSourceById(chunk.sourceId);
      if (!source) continue;
      if (input.sourceIds?.length && !input.sourceIds.includes(source.id)) {
        continue;
      }
      const version = getVersionById(chunk.versionId);
      scored.set(chunk.id, {
        chunk,
        score,
        sourceId: source.id,
        sourceTitle: source.title,
        sourceType: source.type,
        version: version?.version ?? source.currentVersion,
      });
    }
  }

  const hits = [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    query,
    hits,
    provider: embedded.provider,
    model: embedded.model,
    limit,
  };
}
