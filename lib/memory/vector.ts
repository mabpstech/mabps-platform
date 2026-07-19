import { randomUUID } from "node:crypto";
import { sqlite } from "@/lib/db";
import {
  deleteMemoryEmbeddingPg,
  searchMemoryVectorsPg,
  upsertMemoryEmbeddingPg,
} from "@/lib/memory/vector/pgvector";
import type { MemoryEmbeddingRecord } from "@/lib/memory/types";
import { cosineSimilarity, parseVectorJson } from "@/lib/vector/cosine";
import { resolveVectorStoreId } from "@/lib/vector/driver";

function rowToRecord(row: Record<string, unknown>): MemoryEmbeddingRecord {
  return {
    id: String(row.id),
    memoryId: String(row.memoryId),
    workspaceId: String(row.workspaceId),
    provider: String(row.provider),
    model: String(row.model),
    dimensions: Number(row.dimensions || 0),
    vector: parseVectorJson(row.vectorJson),
    createdAt: String(row.createdAt),
  };
}

async function upsertMemoryEmbeddingSqlite(input: {
  memoryId: string;
  workspaceId: string;
  provider: string;
  model: string;
  dimensions: number;
  vector: number[];
}): Promise<void> {
  const now = new Date().toISOString();
  sqlite
    .prepare(
      `INSERT INTO "memory_embedding" (
        "id", "memoryId", "workspaceId", "provider", "model",
        "dimensions", "vectorJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT("memoryId", "provider", "model") DO UPDATE SET
        "workspaceId" = excluded."workspaceId",
        "dimensions" = excluded."dimensions",
        "vectorJson" = excluded."vectorJson",
        "createdAt" = excluded."createdAt"`,
    )
    .run(
      randomUUID(),
      input.memoryId,
      input.workspaceId,
      input.provider,
      input.model,
      input.dimensions,
      JSON.stringify(input.vector),
      now,
    );
}

async function deleteMemoryEmbeddingSqlite(
  memoryId: string,
  workspaceId: string,
): Promise<void> {
  sqlite
    .prepare(
      `DELETE FROM "memory_embedding" WHERE "memoryId" = ? AND "workspaceId" = ?`,
    )
    .run(memoryId, workspaceId);
}

async function searchMemoryVectorsSqlite(input: {
  workspaceId: string;
  vector: number[];
  provider: string;
  model: string;
  memoryIds?: string[];
  limit?: number;
}): Promise<Array<{ memoryId: string; score: number }>> {
  const limit = Math.min(Math.max(input.limit ?? 40, 1), 200);
  let rows: Record<string, unknown>[];

  if (input.memoryIds?.length) {
    const placeholders = input.memoryIds.map(() => "?").join(", ");
    rows = sqlite
      .prepare(
        `SELECT * FROM "memory_embedding"
         WHERE "workspaceId" = ?
           AND "provider" = ?
           AND "model" = ?
           AND "memoryId" IN (${placeholders})`,
      )
      .all(
        input.workspaceId,
        input.provider,
        input.model,
        ...input.memoryIds,
      ) as Record<string, unknown>[];
  } else {
    rows = sqlite
      .prepare(
        `SELECT * FROM "memory_embedding"
         WHERE "workspaceId" = ? AND "provider" = ? AND "model" = ?`,
      )
      .all(input.workspaceId, input.provider, input.model) as Record<
      string,
      unknown
    >[];
  }

  return rows
    .map((row) => {
      const record = rowToRecord(row);
      return {
        memoryId: record.memoryId,
        score: cosineSimilarity(input.vector, record.vector),
      };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function upsertMemoryEmbedding(input: {
  memoryId: string;
  workspaceId: string;
  provider: string;
  model: string;
  dimensions: number;
  vector: number[];
}): Promise<void> {
  if (resolveVectorStoreId() === "pgvector") {
    return upsertMemoryEmbeddingPg(input);
  }
  return upsertMemoryEmbeddingSqlite(input);
}

export async function deleteMemoryEmbedding(
  memoryId: string,
  workspaceId: string,
): Promise<void> {
  if (resolveVectorStoreId() === "pgvector") {
    return deleteMemoryEmbeddingPg(memoryId, workspaceId);
  }
  return deleteMemoryEmbeddingSqlite(memoryId, workspaceId);
}

export async function searchMemoryVectors(input: {
  workspaceId: string;
  vector: number[];
  provider: string;
  model: string;
  memoryIds?: string[];
  limit?: number;
}): Promise<Array<{ memoryId: string; score: number }>> {
  if (resolveVectorStoreId() === "pgvector") {
    return searchMemoryVectorsPg(input);
  }
  return searchMemoryVectorsSqlite(input);
}
