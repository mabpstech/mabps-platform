/** Cosine similarity for in-process vector scoring (SQLite store / fallbacks). */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (!len) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? dot / denom : 0;
}

export function parseVectorJson(raw: unknown): number[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => Number(value) || 0);
  } catch {
    return [];
  }
}

/** Format a JS vector for pgvector text input: `[0.1,0.2,…]`. */
export function toPgvectorLiteral(vector: number[]): string {
  return `[${vector.map((value) => Number(value) || 0).join(",")}]`;
}
