import { getEmbeddingProvider } from "@/lib/knowledge/embeddings";
import { upsertMemoryEmbedding } from "@/lib/memory/vector";

export async function embedMemoryContent(input: {
  memoryId: string;
  workspaceId: string;
  content: string;
  embeddingProvider?: string | null;
}): Promise<{ provider: string; model: string }> {
  const embedder = getEmbeddingProvider(input.embeddingProvider);
  const embedded = await embedder.embed([input.content]);
  const vector = embedded.vectors[0] || [];
  await upsertMemoryEmbedding({
    memoryId: input.memoryId,
    workspaceId: input.workspaceId,
    provider: embedded.provider,
    model: embedded.model,
    dimensions: embedded.dimensions,
    vector,
  });
  return { provider: embedded.provider, model: embedded.model };
}
