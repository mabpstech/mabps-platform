import type { ChatbotKnowledgeChunk } from "@/lib/chatbot/types";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

export function scoreChunk(query: string, content: string): number {
  const queryTokens = new Set(tokenize(query));
  if (!queryTokens.size) return 0;
  const contentTokens = tokenize(content);
  if (!contentTokens.length) return 0;

  let score = 0;
  const seen = new Set<string>();
  for (const token of contentTokens) {
    if (queryTokens.has(token)) {
      score += seen.has(token) ? 0.15 : 1;
      seen.add(token);
    }
  }

  const lowered = content.toLowerCase();
  for (const token of queryTokens) {
    if (lowered.includes(token)) score += 0.25;
  }

  return score;
}

export function retrieveRelevantChunks(
  query: string,
  chunks: ChatbotKnowledgeChunk[],
  limit = 5,
): ChatbotKnowledgeChunk[] {
  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(query, chunk.content) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.chunk);
}

export function formatKnowledgeContext(chunks: ChatbotKnowledgeChunk[]): string {
  if (!chunks.length) return "";
  return chunks
    .map((chunk, index) => `[Source ${index + 1}]\n${chunk.content}`)
    .join("\n\n");
}
