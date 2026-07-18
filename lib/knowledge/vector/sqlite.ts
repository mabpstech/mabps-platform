import { sqlite } from "@/lib/db";
import type {
  VectorRecord,
  VectorSearchHit,
  VectorStore,
  VectorUpsertInput,
} from "@/lib/knowledge/vector/types";

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (!len) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? dot / denom : 0;
}

function parseVector(raw: unknown): number[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => Number(value) || 0);
  } catch {
    return [];
  }
}

function rowToRecord(row: Record<string, unknown>): VectorRecord {
  return {
    id: String(row.id),
    chunkId: String(row.chunkId),
    sourceId: String(row.sourceId),
    versionId: String(row.versionId),
    workspaceId: String(row.workspaceId),
    provider: String(row.provider),
    model: String(row.model),
    dimensions: Number(row.dimensions || 0),
    vector: parseVector(row.vectorJson),
    createdAt: String(row.createdAt),
  };
}

export function createSqliteVectorStore(): VectorStore {
  return {
    id: "sqlite",
    async upsert(records: VectorUpsertInput[]) {
      if (!records.length) return;
      const insert = sqlite.prepare(
        `INSERT INTO "kb_embedding" (
          "id", "chunkId", "sourceId", "versionId", "workspaceId",
          "provider", "model", "dimensions", "vectorJson", "createdAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT("chunkId", "provider", "model") DO UPDATE SET
          "sourceId" = excluded."sourceId",
          "versionId" = excluded."versionId",
          "workspaceId" = excluded."workspaceId",
          "dimensions" = excluded."dimensions",
          "vectorJson" = excluded."vectorJson",
          "createdAt" = excluded."createdAt"`,
      );
      const tx = sqlite.transaction((rows: VectorUpsertInput[]) => {
        for (const row of rows) {
          insert.run(
            row.id,
            row.chunkId,
            row.sourceId,
            row.versionId,
            row.workspaceId,
            row.provider,
            row.model,
            row.dimensions,
            JSON.stringify(row.vector),
            row.createdAt,
          );
        }
      });
      tx(records);
    },
    async deleteBySource(sourceId: string, workspaceId: string) {
      sqlite
        .prepare(
          `DELETE FROM "kb_embedding" WHERE "sourceId" = ? AND "workspaceId" = ?`,
        )
        .run(sourceId, workspaceId);
    },
    async deleteByVersion(versionId: string, workspaceId: string) {
      sqlite
        .prepare(
          `DELETE FROM "kb_embedding" WHERE "versionId" = ? AND "workspaceId" = ?`,
        )
        .run(versionId, workspaceId);
    },
    async search(input): Promise<VectorSearchHit[]> {
      if (!input.versionIds.length || !input.vector.length) return [];
      const placeholders = input.versionIds.map(() => "?").join(", ");
      const rows = sqlite
        .prepare(
          `SELECT * FROM "kb_embedding"
           WHERE "workspaceId" = ?
             AND "provider" = ?
             AND "model" = ?
             AND "versionId" IN (${placeholders})`,
        )
        .all(
          input.workspaceId,
          input.provider,
          input.model,
          ...input.versionIds,
        ) as Record<string, unknown>[];

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
    },
  };
}
