import { cosineSimilarity, toPgvectorLiteral } from "@/lib/vector/cosine";
import {
  ensurePgvectorSchema,
  getVectorPgPool,
} from "@/lib/vector/pg-client";
import type {
  VectorRecord,
  VectorSearchHit,
  VectorStore,
  VectorUpsertInput,
} from "@/lib/knowledge/vector/types";

function rowToRecord(row: Record<string, unknown>): VectorRecord {
  let vector: number[] = [];
  const raw = row.embedding;
  if (typeof raw === "string") {
    const trimmed = raw.replace(/^\[/, "").replace(/\]$/, "");
    vector = trimmed
      ? trimmed.split(",").map((part) => Number(part.trim()) || 0)
      : [];
  } else if (Array.isArray(raw)) {
    vector = raw.map((value) => Number(value) || 0);
  }

  return {
    id: String(row.id),
    chunkId: String(row.chunkId),
    sourceId: String(row.sourceId),
    versionId: String(row.versionId),
    workspaceId: String(row.workspaceId),
    provider: String(row.provider),
    model: String(row.model),
    dimensions: Number(row.dimensions || 0),
    vector,
    createdAt: String(row.createdAt),
  };
}

/**
 * Postgres + pgvector backend for knowledge embeddings.
 * ANN search uses cosine distance (`<=>`) when the extension is available.
 */
export function createPgvectorStore(): VectorStore {
  return {
    id: "pgvector",
    async upsert(records: VectorUpsertInput[]) {
      if (!records.length) return;
      await ensurePgvectorSchema();
      const client = await getVectorPgPool();
      for (const row of records) {
        await client.query(
          `INSERT INTO kb_embedding_vector (
            id, "chunkId", "sourceId", "versionId", "workspaceId",
            provider, model, dimensions, embedding, "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector, $10::timestamptz)
          ON CONFLICT ("chunkId", provider, model) DO UPDATE SET
            "sourceId" = EXCLUDED."sourceId",
            "versionId" = EXCLUDED."versionId",
            "workspaceId" = EXCLUDED."workspaceId",
            dimensions = EXCLUDED.dimensions,
            embedding = EXCLUDED.embedding,
            "createdAt" = EXCLUDED."createdAt"`,
          [
            row.id,
            row.chunkId,
            row.sourceId,
            row.versionId,
            row.workspaceId,
            row.provider,
            row.model,
            row.dimensions,
            toPgvectorLiteral(row.vector),
            row.createdAt,
          ],
        );
      }
    },
    async deleteBySource(sourceId: string, workspaceId: string) {
      await ensurePgvectorSchema();
      const client = await getVectorPgPool();
      await client.query(
        `DELETE FROM kb_embedding_vector
         WHERE "sourceId" = $1 AND "workspaceId" = $2`,
        [sourceId, workspaceId],
      );
    },
    async deleteByVersion(versionId: string, workspaceId: string) {
      await ensurePgvectorSchema();
      const client = await getVectorPgPool();
      await client.query(
        `DELETE FROM kb_embedding_vector
         WHERE "versionId" = $1 AND "workspaceId" = $2`,
        [versionId, workspaceId],
      );
    },
    async search(input): Promise<VectorSearchHit[]> {
      if (!input.versionIds.length || !input.vector.length) return [];
      await ensurePgvectorSchema();
      const client = await getVectorPgPool();
      const literal = toPgvectorLiteral(input.vector);
      try {
        const { rows } = await client.query(
          `SELECT id, "chunkId", "sourceId", "versionId", "workspaceId",
                  provider, model, dimensions, embedding::text AS embedding, "createdAt",
                  1 - (embedding <=> $1::vector) AS score
           FROM kb_embedding_vector
           WHERE "workspaceId" = $2
             AND provider = $3
             AND model = $4
             AND "versionId" = ANY($5::text[])
           ORDER BY embedding <=> $1::vector
           LIMIT $6`,
          [
            literal,
            input.workspaceId,
            input.provider,
            input.model,
            input.versionIds,
            input.limit,
          ],
        );
        return rows.map((row) => ({
          record: rowToRecord(row),
          score: Number(row.score || 0),
        }));
      } catch {
        // Fallback if <=> / extension wiring fails in a partial environment.
        const { rows } = await client.query(
          `SELECT id, "chunkId", "sourceId", "versionId", "workspaceId",
                  provider, model, dimensions, embedding::text AS embedding, "createdAt"
           FROM kb_embedding_vector
           WHERE "workspaceId" = $1
             AND provider = $2
             AND model = $3
             AND "versionId" = ANY($4::text[])`,
          [
            input.workspaceId,
            input.provider,
            input.model,
            input.versionIds,
          ],
        );
        return rows
          .map((row) => {
            const record = rowToRecord(row);
            return {
              record,
              score: cosineSimilarity(input.vector, record.vector),
            };
          })
          .filter((hit) => hit.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, input.limit);
      }
    },
  };
}
