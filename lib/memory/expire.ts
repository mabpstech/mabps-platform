import { ensureMemoryReady, getMemoryOverview } from "@/lib/memory/repository";
import { sqlite } from "@/lib/db";

/**
 * Delete expired memories for a workspace (or all workspaces when omitted).
 */
export function expireMemories(input?: {
  workspaceId?: string;
  before?: string;
}): {
  deleted: number;
  workspaceId?: string;
} {
  ensureMemoryReady();
  const before = input?.before || new Date().toISOString();

  let rows: Array<{ id: string; workspaceId: string }>;
  if (input?.workspaceId) {
    rows = sqlite
      .prepare(
        `SELECT "id", "workspaceId" FROM "memory_entry"
         WHERE "workspaceId" = ?
           AND "expiresAt" IS NOT NULL
           AND "expiresAt" <= ?`,
      )
      .all(input.workspaceId, before) as Array<{
      id: string;
      workspaceId: string;
    }>;
  } else {
    rows = sqlite
      .prepare(
        `SELECT "id", "workspaceId" FROM "memory_entry"
         WHERE "expiresAt" IS NOT NULL AND "expiresAt" <= ?`,
      )
      .all(before) as Array<{ id: string; workspaceId: string }>;
  }

  if (!rows.length) {
    return { deleted: 0, workspaceId: input?.workspaceId };
  }

  const deleteEmbedding = sqlite.prepare(
    `DELETE FROM "memory_embedding" WHERE "memoryId" = ? AND "workspaceId" = ?`,
  );
  const deleteEntry = sqlite.prepare(
    `DELETE FROM "memory_entry" WHERE "id" = ? AND "workspaceId" = ?`,
  );

  const tx = sqlite.transaction(
    (items: Array<{ id: string; workspaceId: string }>) => {
      for (const row of items) {
        deleteEmbedding.run(row.id, row.workspaceId);
        deleteEntry.run(row.id, row.workspaceId);
      }
    },
  );
  tx(rows);

  return { deleted: rows.length, workspaceId: input?.workspaceId };
}

export function purgeExpiredForWorkspace(workspaceId: string) {
  const result = expireMemories({ workspaceId });
  return {
    ...result,
    overview: getMemoryOverview(workspaceId),
  };
}

/** Soft-check helper — count without deleting. */
export function countExpired(workspaceId: string): number {
  ensureMemoryReady();
  const now = new Date().toISOString();
  return Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "memory_entry"
           WHERE "workspaceId" = ?
             AND "expiresAt" IS NOT NULL
             AND "expiresAt" <= ?
             AND "mergedIntoId" IS NULL`,
        )
        .get(workspaceId, now) as { c: number }
    ).c,
  );
}
