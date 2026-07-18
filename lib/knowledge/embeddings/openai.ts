import type {
  EmbeddingProvider,
  EmbeddingResult,
} from "@/lib/knowledge/embeddings/types";

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DIMENSIONS = 1536;

export function createOpenAiEmbeddingProvider(options?: {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}): EmbeddingProvider | null {
  const apiKey =
    options?.apiKey ||
    process.env.OPENAI_API_KEY ||
    process.env.MABPS_OPENAI_API_KEY;
  if (!apiKey) return null;

  const model =
    options?.model ||
    process.env.MABPS_KB_EMBEDDING_MODEL ||
    DEFAULT_MODEL;
  const baseUrl = (
    options?.baseUrl ||
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");

  return {
    id: "openai",
    model,
    dimensions: DEFAULT_DIMENSIONS,
    async embed(texts: string[]): Promise<EmbeddingResult> {
      if (!texts.length) {
        return {
          vectors: [],
          provider: "openai",
          model,
          dimensions: DEFAULT_DIMENSIONS,
        };
      }

      const response = await fetch(`${baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: texts,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `OpenAI embeddings failed (${response.status}): ${body.slice(0, 200)}`,
        );
      }

      const payload = (await response.json()) as {
        data?: Array<{ embedding: number[]; index: number }>;
      };
      const rows = [...(payload.data || [])].sort((a, b) => a.index - b.index);
      if (rows.length !== texts.length) {
        throw new Error("OpenAI embeddings response size mismatch.");
      }

      const vectors = rows.map((row) => row.embedding);
      return {
        vectors,
        provider: "openai",
        model,
        dimensions: vectors[0]?.length || DEFAULT_DIMENSIONS,
      };
    },
  };
}
