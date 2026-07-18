export type EmbeddingProviderId = "local" | "openai";

export type EmbeddingResult = {
  vectors: number[][];
  provider: EmbeddingProviderId;
  model: string;
  dimensions: number;
};

export interface EmbeddingProvider {
  id: EmbeddingProviderId;
  model: string;
  dimensions: number;
  embed(texts: string[]): Promise<EmbeddingResult>;
}
