import { createLocalEmbeddingProvider } from "@/lib/knowledge/embeddings/local";
import { createOpenAiEmbeddingProvider } from "@/lib/knowledge/embeddings/openai";
import type {
  EmbeddingProvider,
  EmbeddingProviderId,
} from "@/lib/knowledge/embeddings/types";

export type { EmbeddingProvider, EmbeddingProviderId, EmbeddingResult } from "@/lib/knowledge/embeddings/types";

export function listEmbeddingProviders(): EmbeddingProviderId[] {
  const providers: EmbeddingProviderId[] = ["local"];
  if (process.env.OPENAI_API_KEY || process.env.MABPS_OPENAI_API_KEY) {
    providers.push("openai");
  }
  return providers;
}

export function getEmbeddingProvider(
  preferred?: EmbeddingProviderId | string | null,
): EmbeddingProvider {
  const requested =
    preferred ||
    process.env.MABPS_KB_EMBEDDING_PROVIDER ||
    "local";

  if (requested === "openai") {
    const openai = createOpenAiEmbeddingProvider();
    if (!openai) {
      throw new Error(
        "OpenAI embedding provider requested but OPENAI_API_KEY is not set.",
      );
    }
    return openai;
  }

  if (requested === "local") {
    return createLocalEmbeddingProvider();
  }

  // Auto: prefer OpenAI when configured, otherwise local hash embeddings.
  if (requested === "auto") {
    return createOpenAiEmbeddingProvider() || createLocalEmbeddingProvider();
  }

  return createLocalEmbeddingProvider();
}
