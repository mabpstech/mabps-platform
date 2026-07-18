import { randomUUID } from "node:crypto";
import {
  DEFAULT_SCOPE_FOR_KIND,
  MAX_MEMORY_CONTENT_CHARS,
} from "@/lib/memory/defaults";
import { embedMemoryContent } from "@/lib/memory/embed";
import { migrateMemorySchema } from "@/lib/memory/migrate";
import {
  clampImportance,
  computeStandingScore,
  defaultExpiresAt,
  defaultImportanceForKind,
  isExpired,
} from "@/lib/memory/scoring";
import type {
  MemoryEntry,
  MemoryKind,
  MemoryListFilters,
  MemoryOverviewStats,
  MemoryScopeType,
  MemoryWriteInput,
} from "@/lib/memory/types";
import { deleteMemoryEmbedding } from "@/lib/memory/vector";
import { sqlite } from "@/lib/db";

function nowIso(): string {
  return new Date().toISOString();
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function likePattern(q: string): string {
  return `%${q.replace(/[%_]/g, "\\$&")}%`;
}

export function ensureMemoryReady(): void {
  migrateMemorySchema();
}

function rowToMemory(row: Record<string, unknown>): MemoryEntry {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    kind: String(row.kind) as MemoryKind,
    scopeType: String(row.scopeType) as MemoryScopeType,
    scopeId: asStringOrNull(row.scopeId),
    key: asStringOrNull(row.key),
    content: String(row.content ?? ""),
    importance: Number(row.importance ?? 0.5),
    score: Number(row.score ?? 0.5),
    source: String(row.source ?? "api"),
    metadata: parseJson<Record<string, unknown>>(row.metadataJson, {}),
    expiresAt: asStringOrNull(row.expiresAt),
    lastAccessedAt: asStringOrNull(row.lastAccessedAt),
    accessCount: Number(row.accessCount ?? 0),
    mergedIntoId: asStringOrNull(row.mergedIntoId),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export function getMemoryOverview(workspaceId: string): MemoryOverviewStats {
  ensureMemoryReady();
  const now = nowIso();
  const total = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "memory_entry"
           WHERE "workspaceId" = ? AND "mergedIntoId" IS NULL`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const countKind = (kind: MemoryKind) =>
    Number(
      (
        sqlite
          .prepare(
            `SELECT COUNT(*) as c FROM "memory_entry"
             WHERE "workspaceId" = ? AND "kind" = ? AND "mergedIntoId" IS NULL
               AND ("expiresAt" IS NULL OR "expiresAt" > ?)`,
          )
          .get(workspaceId, kind, now) as { c: number }
      ).c,
    );
  const expired = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "memory_entry"
           WHERE "workspaceId" = ? AND "expiresAt" IS NOT NULL AND "expiresAt" <= ?
             AND "mergedIntoId" IS NULL`,
        )
        .get(workspaceId, now) as { c: number }
    ).c,
  );
  const merged = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "memory_entry"
           WHERE "workspaceId" = ? AND "mergedIntoId" IS NOT NULL`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const avgRow = sqlite
    .prepare(
      `SELECT AVG("importance") as avg FROM "memory_entry"
       WHERE "workspaceId" = ? AND "mergedIntoId" IS NULL
         AND ("expiresAt" IS NULL OR "expiresAt" > ?)`,
    )
    .get(workspaceId, now) as { avg: number | null };

  return {
    total,
    shortTerm: countKind("short_term"),
    longTerm: countKind("long_term"),
    profile: countKind("profile"),
    business: countKind("business"),
    expired,
    merged,
    avgImportance: Number(avgRow.avg ?? 0),
  };
}

export function getMemoryById(id: string): MemoryEntry | null {
  ensureMemoryReady();
  const row = sqlite
    .prepare(`SELECT * FROM "memory_entry" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToMemory(row) : null;
}

export function getMemoryForWorkspace(
  id: string,
  workspaceId: string,
): MemoryEntry | null {
  const memory = getMemoryById(id);
  if (!memory || memory.workspaceId !== workspaceId) return null;
  return memory;
}

export function listMemories(
  workspaceId: string,
  filters: MemoryListFilters = {},
): MemoryEntry[] {
  ensureMemoryReady();
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
  const offset = Math.max(filters.offset ?? 0, 0);
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  const now = nowIso();

  if (!filters.includeMerged) {
    clauses.push(`"mergedIntoId" IS NULL`);
  }
  if (!filters.includeExpired) {
    clauses.push(`("expiresAt" IS NULL OR "expiresAt" > ?)`);
    params.push(now);
  }
  if (filters.kind) {
    clauses.push(`"kind" = ?`);
    params.push(filters.kind);
  }
  if (filters.scopeType) {
    clauses.push(`"scopeType" = ?`);
    params.push(filters.scopeType);
  }
  if (filters.scopeId) {
    clauses.push(`"scopeId" = ?`);
    params.push(filters.scopeId);
  }
  if (filters.key) {
    clauses.push(`"key" = ?`);
    params.push(filters.key);
  }
  if (filters.q) {
    clauses.push(`("content" LIKE ? ESCAPE '\\' OR "key" LIKE ? ESCAPE '\\')`);
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }

  params.push(limit, offset);
  const rows = sqlite
    .prepare(
      `SELECT * FROM "memory_entry"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "score" DESC, "updatedAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];

  return rows.map(rowToMemory);
}

function findByKey(input: {
  workspaceId: string;
  kind: MemoryKind;
  scopeType: MemoryScopeType;
  scopeId: string | null;
  key: string;
}): MemoryEntry | null {
  const row = sqlite
    .prepare(
      `SELECT * FROM "memory_entry"
       WHERE "workspaceId" = ?
         AND "kind" = ?
         AND "scopeType" = ?
         AND (("scopeId" IS NULL AND ? IS NULL) OR "scopeId" = ?)
         AND "key" = ?
         AND "mergedIntoId" IS NULL
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
    )
    .get(
      input.workspaceId,
      input.kind,
      input.scopeType,
      input.scopeId,
      input.scopeId,
      input.key,
    ) as Record<string, unknown> | undefined;
  return row ? rowToMemory(row) : null;
}

export async function writeMemory(
  input: MemoryWriteInput,
): Promise<MemoryEntry> {
  ensureMemoryReady();
  const content = input.content.trim();
  if (!content) throw new Error("Memory content is required.");
  if (content.length > MAX_MEMORY_CONTENT_CHARS) {
    throw new Error(
      `Memory content must be at most ${MAX_MEMORY_CONTENT_CHARS} characters.`,
    );
  }

  const kind = input.kind;
  const scopeType = input.scopeType || DEFAULT_SCOPE_FOR_KIND[kind];
  const scopeId =
    scopeType === "workspace"
      ? null
      : asStringOrNull(input.scopeId ?? null);
  const key = asStringOrNull(input.key ?? null);
  const importance = clampImportance(
    input.importance ?? defaultImportanceForKind(kind),
  );
  const source = (input.source || "api").trim() || "api";
  const metadata = input.metadata || {};
  const expiresAt =
    input.expiresAt === undefined
      ? defaultExpiresAt(kind)
      : defaultExpiresAt(kind, input.expiresAt);
  const now = nowIso();

  if (input.upsertByKey && key) {
    const existing = findByKey({
      workspaceId: input.workspaceId,
      kind,
      scopeType,
      scopeId,
      key,
    });
    if (existing) {
      return updateMemory(existing.id, input.workspaceId, {
        content,
        importance,
        source,
        metadata,
        expiresAt,
        kind,
        scopeType,
        scopeId,
        key,
      });
    }
  }

  const id = randomUUID();
  const score = computeStandingScore({
    importance,
    updatedAt: now,
    accessCount: 0,
    kind,
  });

  sqlite
    .prepare(
      `INSERT INTO "memory_entry" (
        "id", "workspaceId", "kind", "scopeType", "scopeId", "key",
        "content", "importance", "score", "source", "metadataJson",
        "expiresAt", "lastAccessedAt", "accessCount", "mergedIntoId",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, NULL, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      kind,
      scopeType,
      scopeId,
      key,
      content,
      importance,
      score,
      source,
      JSON.stringify(metadata),
      expiresAt,
      now,
      now,
    );

  await embedMemoryContent({
    memoryId: id,
    workspaceId: input.workspaceId,
    content,
  });

  return getMemoryById(id)!;
}

export async function updateMemory(
  id: string,
  workspaceId: string,
  input: {
    content?: string;
    importance?: number;
    source?: string;
    metadata?: Record<string, unknown>;
    expiresAt?: string | null;
    kind?: MemoryKind;
    scopeType?: MemoryScopeType;
    scopeId?: string | null;
    key?: string | null;
  },
): Promise<MemoryEntry> {
  ensureMemoryReady();
  const current = getMemoryForWorkspace(id, workspaceId);
  if (!current) throw new Error("Memory not found.");
  if (current.mergedIntoId) {
    throw new Error("Cannot update a memory that was merged.");
  }

  const content =
    typeof input.content === "string" ? input.content.trim() : current.content;
  if (!content) throw new Error("Memory content is required.");
  if (content.length > MAX_MEMORY_CONTENT_CHARS) {
    throw new Error(
      `Memory content must be at most ${MAX_MEMORY_CONTENT_CHARS} characters.`,
    );
  }

  const kind = input.kind || current.kind;
  const scopeType = input.scopeType || current.scopeType;
  const scopeId =
    input.scopeId !== undefined
      ? asStringOrNull(input.scopeId)
      : current.scopeId;
  const key = input.key !== undefined ? asStringOrNull(input.key) : current.key;
  const importance = clampImportance(
    input.importance !== undefined ? input.importance : current.importance,
  );
  const source = input.source?.trim() || current.source;
  const metadata = input.metadata ?? current.metadata;
  const expiresAt =
    input.expiresAt !== undefined
      ? defaultExpiresAt(kind, input.expiresAt)
      : current.expiresAt;
  const now = nowIso();
  const score = computeStandingScore({
    importance,
    updatedAt: now,
    accessCount: current.accessCount,
    kind,
  });

  sqlite
    .prepare(
      `UPDATE "memory_entry" SET
        "kind" = ?, "scopeType" = ?, "scopeId" = ?, "key" = ?,
        "content" = ?, "importance" = ?, "score" = ?, "source" = ?,
        "metadataJson" = ?, "expiresAt" = ?, "updatedAt" = ?
       WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(
      kind,
      scopeType,
      scopeId,
      key,
      content,
      importance,
      score,
      source,
      JSON.stringify(metadata),
      expiresAt,
      now,
      id,
      workspaceId,
    );

  if (content !== current.content) {
    await embedMemoryContent({
      memoryId: id,
      workspaceId,
      content,
    });
  }

  return getMemoryById(id)!;
}

export async function deleteMemory(
  id: string,
  workspaceId: string,
): Promise<void> {
  ensureMemoryReady();
  const current = getMemoryForWorkspace(id, workspaceId);
  if (!current) throw new Error("Memory not found.");
  await deleteMemoryEmbedding(id, workspaceId);
  sqlite
    .prepare(`DELETE FROM "memory_entry" WHERE "id" = ? AND "workspaceId" = ?`)
    .run(id, workspaceId);
}

export function touchMemoryAccess(ids: string[], workspaceId: string): void {
  if (!ids.length) return;
  ensureMemoryReady();
  const now = nowIso();
  const stmt = sqlite.prepare(
    `UPDATE "memory_entry" SET
      "accessCount" = "accessCount" + 1,
      "lastAccessedAt" = ?,
      "score" = ?,
      "updatedAt" = "updatedAt"
     WHERE "id" = ? AND "workspaceId" = ?`,
  );
  const tx = sqlite.transaction((memoryIds: string[]) => {
    for (const id of memoryIds) {
      const current = getMemoryForWorkspace(id, workspaceId);
      if (!current || isExpired(current)) continue;
      const score = computeStandingScore({
        importance: current.importance,
        updatedAt: current.updatedAt,
        accessCount: current.accessCount + 1,
        kind: current.kind,
      });
      stmt.run(now, score, id, workspaceId);
    }
  });
  tx(ids);
}

export function markMerged(
  sourceIds: string[],
  targetId: string,
  workspaceId: string,
): void {
  ensureMemoryReady();
  const now = nowIso();
  const stmt = sqlite.prepare(
    `UPDATE "memory_entry" SET "mergedIntoId" = ?, "updatedAt" = ?
     WHERE "id" = ? AND "workspaceId" = ?`,
  );
  const tx = sqlite.transaction((ids: string[]) => {
    for (const id of ids) {
      if (id === targetId) continue;
      stmt.run(targetId, now, id, workspaceId);
    }
  });
  tx(sourceIds);
}

export function listActiveMemoryIds(
  workspaceId: string,
  options?: {
    kinds?: MemoryKind[];
    scopeType?: MemoryScopeType;
    scopeId?: string | null;
  },
): string[] {
  ensureMemoryReady();
  const now = nowIso();
  const clauses = [
    `"workspaceId" = ?`,
    `"mergedIntoId" IS NULL`,
    `("expiresAt" IS NULL OR "expiresAt" > ?)`,
  ];
  const params: unknown[] = [workspaceId, now];

  if (options?.kinds?.length) {
    clauses.push(
      `"kind" IN (${options.kinds.map(() => "?").join(", ")})`,
    );
    params.push(...options.kinds);
  }
  if (options?.scopeType) {
    clauses.push(`"scopeType" = ?`);
    params.push(options.scopeType);
  }
  if (options?.scopeId !== undefined) {
    if (options.scopeId === null) {
      clauses.push(`"scopeId" IS NULL`);
    } else {
      clauses.push(`"scopeId" = ?`);
      params.push(options.scopeId);
    }
  }

  const rows = sqlite
    .prepare(
      `SELECT "id" FROM "memory_entry" WHERE ${clauses.join(" AND ")}`,
    )
    .all(...params) as Array<{ id: string }>;
  return rows.map((row) => row.id);
}
