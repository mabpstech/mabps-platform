import { createHash } from "node:crypto";
import type {
  EmbeddingProvider,
  EmbeddingResult,
} from "@/lib/knowledge/embeddings/types";

const DIMENSIONS = 256;
const MODEL = "local-hash-v1";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

function embedOne(text: string): number[] {
  const vector = new Array<number>(DIMENSIONS).fill(0);
  const tokens = tokenize(text);
  if (!tokens.length) {
    vector[0] = 1;
    return vector;
  }

  for (const token of tokens) {
    const digest = createHash("sha256").update(token).digest();
    for (let i = 0; i < 8; i++) {
      const index = digest.readUInt16BE(i * 2) % DIMENSIONS;
      const sign = digest[16 + i] % 2 === 0 ? 1 : -1;
      const weight = 1 + (digest[24 + (i % 8)] % 5) / 5;
      vector[index] += sign * weight;
    }
  }

  // Lightweight bigrams for phrase sensitivity.
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]}_${tokens[i + 1]}`;
    const digest = createHash("sha256").update(bigram).digest();
    const index = digest.readUInt16BE(0) % DIMENSIONS;
    vector[index] += 1.5;
  }

  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return vector.map((value) => value / norm);
}

export function createLocalEmbeddingProvider(): EmbeddingProvider {
  return {
    id: "local",
    model: MODEL,
    dimensions: DIMENSIONS,
    async embed(texts: string[]): Promise<EmbeddingResult> {
      return {
        vectors: texts.map(embedOne),
        provider: "local",
        model: MODEL,
        dimensions: DIMENSIONS,
      };
    },
  };
}
