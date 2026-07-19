import { randomUUID } from "node:crypto";
import { cosineSimilarity, toPgvectorLiteral } from "@/lib/vector/cosine";
import {
  ensurePgvectorSchema,
  getVectorPgPool,
} from "@/lib/vector/pg-client";

/**
 * Postgres + pgvector backend for memory embeddings (P3-5).
 */
export async function upsertMemoryEmbeddingPg(input: {
  memoryId: string;
  workspaceId: string;
  provider: string;
  model: string;
  dimensions: number;
  vector: number[];
}): Promise<void> {
  await ensurePgvectorSchema();
  const client = await getVectorPgPool();
  const now = new Date().toISOString();
  await client.query(
    `INSERT INTO memory_embedding_vector (
      id, "memoryId", "workspaceId", provider, model,
      dimensions, embedding, "createdAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8::timestamptz)
    ON CONFLICT ("memoryId", provider, model) DO UPDATE SET
      "workspaceId" = EXCLUDED."workspaceId",
      dimensions = EXCLUDED.dimensions,
      embedding = EXCLUDED.embedding,
      "createdAt" = EXCLUDED."createdAt"`,
    [
      randomUUID(),
      input.memoryId,
      input.workspaceId,
      input.provider,
      input.model,
      input.dimensions,
      toPgvectorLiteral(input.vector),
      now,
    ],
  );
}

export async function deleteMemoryEmbeddingPg(
  memoryId: string,
  workspaceId: string,
): Promise<void> {
  await ensurePgvectorSchema();
  const client = await getVectorPgPool();
  await client.query(
    `DELETE FROM memory_embedding_vector
     WHERE "memoryId" = $1 AND "workspaceId" = $2`,
    [memoryId, workspaceId],
  );
}

export async function searchMemoryVectorsPg(input: {
  workspaceId: string;
  vector: number[];
  provider: string;
  model: string;
  memoryIds?: string[];
  limit?: number;
}): Promise<Array<{ memoryId: string; score: number }>> {
  const limit = Math.min(Math.max(input.limit ?? 40, 1), 200);
  await ensurePgvectorSchema();
  const client = await getVectorPgPool();
  const literal = toPgvectorLiteral(input.vector);

  try {
    if (input.memoryIds?.length) {
      const { rows } = await client.query(
        `SELECT "memoryId", 1 - (embedding <=> $1::vector) AS score
         FROM memory_embedding_vector
         WHERE "workspaceId" = $2
           AND provider = $3
           AND model = $4
           AND "memoryId" = ANY($5::text[])
         ORDER BY embedding <=> $1::vector
         LIMIT $6`,
        [
          literal,
          input.workspaceId,
          input.provider,
          input.model,
          input.memoryIds,
          limit,
        ],
      );
      return rows.map((row) => ({
        memoryId: String(row.memoryId),
        score: Number(row.score || 0),
      }));
    }

    const { rows } = await client.query(
      `SELECT "memoryId", 1 - (embedding <=> $1::vector) AS score
       FROM memory_embedding_vector
       WHERE "workspaceId" = $2
         AND provider = $3
         AND model = $4
       ORDER BY embedding <=> $1::vector
       LIMIT $5`,
      [literal, input.workspaceId, input.provider, input.model, limit],
    );
    return rows.map((row) => ({
      memoryId: String(row.memoryId),
      score: Number(row.score || 0),
    }));
  } catch {
    const { rows } = await client.query(
      input.memoryIds?.length
        ? `SELECT "memoryId", embedding::text AS embedding
           FROM memory_embedding_vector
           WHERE "workspaceId" = $1 AND provider = $2 AND model = $3
             AND "memoryId" = ANY($4::text[])`
        : `SELECT "memoryId", embedding::text AS embedding
           FROM memory_embedding_vector
           WHERE "workspaceId" = $1 AND provider = $2 AND model = $3`,
      input.memoryIds?.length
        ? [
            input.workspaceId,
            input.provider,
            input.model,
            input.memoryIds,
          ]
        : [input.workspaceId, input.provider, input.model],
    );

    return rows
      .map((row) => {
        const raw = String(row.embedding || "")
          .replace(/^\[/, "")
          .replace(/\]$/, "");
        const vector = raw
          ? raw.split(",").map((part) => Number(part.trim()) || 0)
          : [];
        return {
          memoryId: String(row.memoryId),
          score: cosineSimilarity(input.vector, vector),
        };
      })
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
