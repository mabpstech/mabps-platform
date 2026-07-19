/**
 * Cross-module facades for **workspace** knowledge (`kb_*` tables only).
 *
 * Chatbot-local KB (`chatbot_knowledge_*`) is owned by `lib/chatbot/knowledge`
 * and is never queried here. See docs/KNOWLEDGE.md.
 */
import {
  formatKnowledgeContext,
  searchKnowledge,
} from "@/lib/knowledge/search";
import { ensureKnowledgeReady } from "@/lib/knowledge/repository";
import type { KbSearchHit, KbSearchResult } from "@/lib/knowledge/types";

/**
 * Chatbot engine consumer — workspace semantic retrieval for grounded replies.
 * Pair with bot-local `retrieveRelevantChunks` in the chatbot engine.
 */
export async function searchKnowledgeForChatbot(input: {
  workspaceId: string;
  query: string;
  limit?: number;
  sourceIds?: string[];
}): Promise<{
  result: KbSearchResult;
  context: string;
  chunkIds: string[];
  hits: KbSearchHit[];
}> {
  ensureKnowledgeReady();
  const result = await searchKnowledge({
    workspaceId: input.workspaceId,
    query: input.query,
    limit: input.limit ?? 5,
    sourceIds: input.sourceIds,
  });
  return {
    result,
    context: formatKnowledgeContext(result.hits),
    chunkIds: result.hits.map((hit) => hit.chunk.id),
    hits: result.hits,
  };
}

/**
 * Automation engine consumer — retrieve KB context inside a workflow step.
 */
export async function searchKnowledgeForAutomation(input: {
  workspaceId: string;
  query: string;
  limit?: number;
  sourceIds?: string[];
}): Promise<{
  ok: true;
  query: string;
  context: string;
  hits: Array<{
    chunkId: string;
    sourceId: string;
    sourceTitle: string;
    score: number;
    content: string;
  }>;
}> {
  ensureKnowledgeReady();
  const result = await searchKnowledge({
    workspaceId: input.workspaceId,
    query: input.query,
    limit: input.limit ?? 5,
    sourceIds: input.sourceIds,
  });

  return {
    ok: true,
    query: result.query,
    context: formatKnowledgeContext(result.hits),
    hits: result.hits.map((hit) => ({
      chunkId: hit.chunk.id,
      sourceId: hit.sourceId,
      sourceTitle: hit.sourceTitle,
      score: hit.score,
      content: hit.chunk.content,
    })),
  };
}
