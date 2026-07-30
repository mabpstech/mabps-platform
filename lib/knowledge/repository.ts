import { randomUUID } from "node:crypto";
import { migrateKnowledgeSchema } from "@/lib/knowledge/migrate";
import { removeKnowledgeFile } from "@/lib/knowledge/storage";
import type {
  KbChunk,
  KbCrawlConfig,
  KbListFilters,
  KbOverviewStats,
  KbSource,
  KbSourceStatus,
  KbSourceType,
  KbSourceVersion,
  KbVersionStatus,
} from "@/lib/knowledge/types";
import { getVectorStore } from "@/lib/knowledge/vector";
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

export function ensureKnowledgeReady(): void {
  migrateKnowledgeSchema();
}

function rowToSource(row: Record<string, unknown>): KbSource {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    type: String(row.type) as KbSourceType,
    title: String(row.title),
    status: String(row.status) as KbSourceStatus,
    sourceUrl: asStringOrNull(row.sourceUrl),
    fileName: asStringOrNull(row.fileName),
    mimeType: asStringOrNull(row.mimeType),
    storagePath: asStringOrNull(row.storagePath),
    byteSize: Number(row.byteSize ?? 0),
    errorMessage: asStringOrNull(row.errorMessage),
    chunkCount: Number(row.chunkCount ?? 0),
    currentVersion: Number(row.currentVersion ?? 0),
    crawlConfig: parseJson<KbCrawlConfig>(row.crawlConfigJson, {}),
    metadata: parseJson<Record<string, unknown>>(row.metadataJson, {}),
    lastIndexedAt: asStringOrNull(row.lastIndexedAt),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToVersion(row: Record<string, unknown>): KbSourceVersion {
  return {
    id: String(row.id),
    sourceId: String(row.sourceId),
    workspaceId: String(row.workspaceId),
    version: Number(row.version ?? 0),
    status: String(row.status) as KbVersionStatus,
    chunkCount: Number(row.chunkCount ?? 0),
    contentHash: asStringOrNull(row.contentHash),
    errorMessage: asStringOrNull(row.errorMessage),
    createdAt: String(row.createdAt),
    indexedAt: asStringOrNull(row.indexedAt),
  };
}

function rowToChunk(row: Record<string, unknown>): KbChunk {
  return {
    id: String(row.id),
    sourceId: String(row.sourceId),
    versionId: String(row.versionId),
    workspaceId: String(row.workspaceId),
    chunkIndex: Number(row.chunkIndex ?? 0),
    content: String(row.content ?? ""),
    tokenEstimate: Number(row.tokenEstimate ?? 0),
    metadata: parseJson<Record<string, unknown>>(row.metadataJson, {}),
    createdAt: String(row.createdAt),
  };
}

export function getKnowledgeOverview(workspaceId: string): KbOverviewStats {
  ensureKnowledgeReady();
  const sources = Number(
    (
      sqlite
        .prepare(`SELECT COUNT(*) as c FROM "kb_source" WHERE "workspaceId" = ?`)
        .get(workspaceId) as { c: number }
    ).c,
  );
  const readySources = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "kb_source" WHERE "workspaceId" = ? AND "status" = 'ready'`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const errorSources = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "kb_source" WHERE "workspaceId" = ? AND "status" = 'error'`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const chunks = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "kb_chunk" c
           INNER JOIN "kb_source" s ON s."id" = c."sourceId"
           INNER JOIN "kb_source_version" v ON v."id" = c."versionId"
           WHERE c."workspaceId" = ?
             AND v."status" = 'ready'
             AND v."version" = s."currentVersion"`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const versions = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "kb_source_version" WHERE "workspaceId" = ?`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const websites = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "kb_source" WHERE "workspaceId" = ? AND "type" = 'website'`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );
  const files = Number(
    (
      sqlite
        .prepare(
          `SELECT COUNT(*) as c FROM "kb_source" WHERE "workspaceId" = ? AND "type" != 'website'`,
        )
        .get(workspaceId) as { c: number }
    ).c,
  );

  return {
    sources,
    readySources,
    errorSources,
    chunks,
    versions,
    websites,
    files,
  };
}

export function listSources(
  workspaceId: string,
  filters: KbListFilters = {},
): KbSource[] {
  ensureKnowledgeReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.type) {
    clauses.push(`"type" = ?`);
    params.push(filters.type);
  }
  if (filters.q) {
    clauses.push(`("title" LIKE ? ESCAPE '\\' OR "sourceUrl" LIKE ? ESCAPE '\\' OR "fileName" LIKE ? ESCAPE '\\')`);
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern);
  }

  let sql = `SELECT * FROM "kb_source" WHERE ${clauses.join(" AND ")} ORDER BY "createdAt" DESC`;
  if (filters.limit) {
    sql += ` LIMIT ?`;
    params.push(filters.limit);
    if (typeof filters.offset === "number") {
      sql += ` OFFSET ?`;
      params.push(filters.offset);
    }
  }

  const rows = sqlite.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToSource);
}

export function getSourceById(id: string): KbSource | null {
  ensureKnowledgeReady();
  const row = sqlite
    .prepare(`SELECT * FROM "kb_source" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToSource(row) : null;
}

export function getSourceForWorkspace(
  id: string,
  workspaceId: string,
): KbSource | null {
  const source = getSourceById(id);
  if (!source || source.workspaceId !== workspaceId) return null;
  return source;
}

export function listSourceVersions(sourceId: string): KbSourceVersion[] {
  ensureKnowledgeReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "kb_source_version" WHERE "sourceId" = ? ORDER BY "version" DESC`,
    )
    .all(sourceId) as Record<string, unknown>[];
  return rows.map(rowToVersion);
}

export function getVersionById(id: string): KbSourceVersion | null {
  ensureKnowledgeReady();
  const row = sqlite
    .prepare(`SELECT * FROM "kb_source_version" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToVersion(row) : null;
}

export function getChunkById(id: string): KbChunk | null {
  ensureKnowledgeReady();
  const row = sqlite
    .prepare(`SELECT * FROM "kb_chunk" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToChunk(row) : null;
}

export function listChunksForSource(
  sourceId: string,
  versionId?: string,
): KbChunk[] {
  ensureKnowledgeReady();
  if (versionId) {
    const rows = sqlite
      .prepare(
        `SELECT * FROM "kb_chunk" WHERE "sourceId" = ? AND "versionId" = ? ORDER BY "chunkIndex" ASC`,
      )
      .all(sourceId, versionId) as Record<string, unknown>[];
    return rows.map(rowToChunk);
  }

  const source = getSourceById(sourceId);
  if (!source || !source.currentVersion) return [];
  const version = sqlite
    .prepare(
      `SELECT * FROM "kb_source_version" WHERE "sourceId" = ? AND "version" = ?`,
    )
    .get(sourceId, source.currentVersion) as Record<string, unknown> | undefined;
  if (!version) return [];
  return listChunksForSource(sourceId, String(version.id));
}

export function listChunksForVersions(
  workspaceId: string,
  versionIds: string[],
): KbChunk[] {
  ensureKnowledgeReady();
  if (!versionIds.length) return [];
  const placeholders = versionIds.map(() => "?").join(", ");
  const rows = sqlite
    .prepare(
      `SELECT * FROM "kb_chunk"
       WHERE "workspaceId" = ?
         AND "versionId" IN (${placeholders})
       ORDER BY "sourceId", "chunkIndex"`,
    )
    .all(workspaceId, ...versionIds) as Record<string, unknown>[];
  return rows.map(rowToChunk);
}

export function listActiveVersionIds(
  workspaceId: string,
  sourceIds?: string[],
): string[] {
  ensureKnowledgeReady();
  if (sourceIds?.length) {
    const placeholders = sourceIds.map(() => "?").join(", ");
    const rows = sqlite
      .prepare(
        `SELECT v."id" as id
         FROM "kb_source_version" v
         INNER JOIN "kb_source" s ON s."id" = v."sourceId"
         WHERE s."workspaceId" = ?
           AND s."status" = 'ready'
           AND v."status" = 'ready'
           AND v."version" = s."currentVersion"
           AND s."id" IN (${placeholders})`,
      )
      .all(workspaceId, ...sourceIds) as Array<{ id: string }>;
    return rows.map((row) => row.id);
  }

  const rows = sqlite
    .prepare(
      `SELECT v."id" as id
       FROM "kb_source_version" v
       INNER JOIN "kb_source" s ON s."id" = v."sourceId"
       WHERE s."workspaceId" = ?
         AND s."status" = 'ready'
         AND v."status" = 'ready'
         AND v."version" = s."currentVersion"`,
    )
    .all(workspaceId) as Array<{ id: string }>;
  return rows.map((row) => row.id);
}

export function createSourceVersion(input: {
  sourceId: string;
  workspaceId: string;
  version: number;
}): KbSourceVersion {
  ensureKnowledgeReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "kb_source_version" (
        "id", "sourceId", "workspaceId", "version", "status",
        "chunkCount", "contentHash", "errorMessage", "createdAt", "indexedAt"
      ) VALUES (?, ?, ?, ?, 'processing', 0, NULL, NULL, ?, NULL)`,
    )
    .run(id, input.sourceId, input.workspaceId, input.version, timestamp);
  return getVersionById(id)!;
}

export function insertChunks(input: {
  sourceId: string;
  versionId: string;
  workspaceId: string;
  chunks: Array<{
    content: string;
    tokenEstimate: number;
    metadata?: Record<string, unknown>;
  }>;
}): KbChunk[] {
  ensureKnowledgeReady();
  const insert = sqlite.prepare(
    `INSERT INTO "kb_chunk" (
      "id", "sourceId", "versionId", "workspaceId", "chunkIndex",
      "content", "tokenEstimate", "metadataJson", "createdAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const timestamp = nowIso();
  const rows: KbChunk[] = [];
  const tx = sqlite.transaction(() => {
    input.chunks.forEach((chunk, chunkIndex) => {
      const id = randomUUID();
      insert.run(
        id,
        input.sourceId,
        input.versionId,
        input.workspaceId,
        chunkIndex,
        chunk.content,
        chunk.tokenEstimate,
        JSON.stringify(chunk.metadata || {}),
        timestamp,
      );
      rows.push({
        id,
        sourceId: input.sourceId,
        versionId: input.versionId,
        workspaceId: input.workspaceId,
        chunkIndex,
        content: chunk.content,
        tokenEstimate: chunk.tokenEstimate,
        metadata: chunk.metadata || {},
        createdAt: timestamp,
      });
    });
  });
  tx();
  return rows;
}

export function deleteChunksForVersion(versionId: string): void {
  ensureKnowledgeReady();
  sqlite.prepare(`DELETE FROM "kb_chunk" WHERE "versionId" = ?`).run(versionId);
}

export function markVersionReady(input: {
  versionId: string;
  chunkCount: number;
  contentHash: string;
}): void {
  ensureKnowledgeReady();
  sqlite
    .prepare(
      `UPDATE "kb_source_version" SET
        "status" = 'ready',
        "chunkCount" = ?,
        "contentHash" = ?,
        "errorMessage" = NULL,
        "indexedAt" = ?
      WHERE "id" = ?`,
    )
    .run(input.chunkCount, input.contentHash, nowIso(), input.versionId);
}

export function markVersionError(versionId: string, message: string): void {
  ensureKnowledgeReady();
  sqlite
    .prepare(
      `UPDATE "kb_source_version" SET
        "status" = 'error',
        "errorMessage" = ?,
        "indexedAt" = ?
      WHERE "id" = ?`,
    )
    .run(message, nowIso(), versionId);
}

export function supersedeOlderVersions(
  sourceId: string,
  keepVersionId: string,
): void {
  ensureKnowledgeReady();
  const older = sqlite
    .prepare(
      `SELECT "id" FROM "kb_source_version"
       WHERE "sourceId" = ? AND "id" != ? AND "status" = 'ready'`,
    )
    .all(sourceId, keepVersionId) as Array<{ id: string }>;

  sqlite
    .prepare(
      `UPDATE "kb_source_version"
       SET "status" = 'superseded'
       WHERE "sourceId" = ? AND "id" != ? AND "status" = 'ready'`,
    )
    .run(sourceId, keepVersionId);

  for (const row of older) {
    deleteChunksForVersion(row.id);
    // Embeddings cascade via chunk delete is not automatic; remove explicitly.
    sqlite
      .prepare(`DELETE FROM "kb_embedding" WHERE "versionId" = ?`)
      .run(row.id);
  }
}

export function updateSourceIndexingState(
  sourceId: string,
  patch: {
    status: KbSourceStatus;
    errorMessage?: string | null;
    chunkCount?: number;
    currentVersion?: number;
    lastIndexedAt?: string | null;
    metadata?: Record<string, unknown>;
  },
): void {
  ensureKnowledgeReady();
  const source = getSourceById(sourceId);
  if (!source) return;
  sqlite
    .prepare(
      `UPDATE "kb_source" SET
        "status" = ?,
        "errorMessage" = ?,
        "chunkCount" = ?,
        "currentVersion" = ?,
        "lastIndexedAt" = ?,
        "metadataJson" = ?,
        "updatedAt" = ?
      WHERE "id" = ?`,
    )
    .run(
      patch.status,
      patch.errorMessage === undefined
        ? source.errorMessage
        : patch.errorMessage,
      patch.chunkCount ?? source.chunkCount,
      patch.currentVersion ?? source.currentVersion,
      patch.lastIndexedAt === undefined
        ? source.lastIndexedAt
        : patch.lastIndexedAt,
      JSON.stringify(patch.metadata ?? source.metadata),
      nowIso(),
      sourceId,
    );
}

export function insertFileSourceRow(input: {
  workspaceId: string;
  title: string;
  type: string;
  originalName: string;
  mimeType: string;
  storagePath: string;
  byteSize: number;
}): KbSource {
  ensureKnowledgeReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "kb_source" (
        "id", "workspaceId", "type", "title", "status", "sourceUrl",
        "fileName", "mimeType", "storagePath", "byteSize", "errorMessage",
        "chunkCount", "currentVersion", "crawlConfigJson", "metadataJson",
        "lastIndexedAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, 'pending', NULL, ?, ?, ?, ?, NULL, 0, 0, '{}', '{}', NULL, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.type,
      input.title.trim() || input.originalName,
      input.originalName,
      input.mimeType,
      input.storagePath,
      input.byteSize,
      timestamp,
      timestamp,
    );
  return getSourceById(id)!;
}

export function insertWebsiteSourceRow(input: {
  workspaceId: string;
  title: string;
  sourceUrl: string;
  crawlConfig?: KbCrawlConfig;
}): KbSource {
  ensureKnowledgeReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "kb_source" (
        "id", "workspaceId", "type", "title", "status", "sourceUrl",
        "fileName", "mimeType", "storagePath", "byteSize", "errorMessage",
        "chunkCount", "currentVersion", "crawlConfigJson", "metadataJson",
        "lastIndexedAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, 'website', ?, 'pending', ?, NULL, 'text/html', NULL, 0, NULL, 0, 0, ?, '{}', NULL, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.title.trim() || input.sourceUrl,
      input.sourceUrl,
      JSON.stringify(input.crawlConfig || {}),
      timestamp,
      timestamp,
    );
  return getSourceById(id)!;
}

export async function deleteSource(
  id: string,
  workspaceId: string,
): Promise<void> {
  ensureKnowledgeReady();
  const source = getSourceForWorkspace(id, workspaceId);
  if (!source) throw new Error("Knowledge source not found.");

  await getVectorStore().deleteBySource(source.id, workspaceId);
  removeKnowledgeFile(source.storagePath, workspaceId);
  sqlite
    .prepare(`DELETE FROM "kb_source" WHERE "id" = ? AND "workspaceId" = ?`)
    .run(id, workspaceId);
}

export function updateSourceMeta(
  id: string,
  workspaceId: string,
  patch: {
    title?: string;
    crawlConfig?: KbCrawlConfig;
  },
): KbSource {
  ensureKnowledgeReady();
  const source = getSourceForWorkspace(id, workspaceId);
  if (!source) throw new Error("Knowledge source not found.");

  const title = patch.title?.trim() || source.title;
  const crawlConfig = patch.crawlConfig ?? source.crawlConfig;
  sqlite
    .prepare(
      `UPDATE "kb_source" SET
        "title" = ?,
        "crawlConfigJson" = ?,
        "updatedAt" = ?
      WHERE "id" = ? AND "workspaceId" = ?`,
    )
    .run(title, JSON.stringify(crawlConfig), nowIso(), id, workspaceId);

  return getSourceById(id)!;
}
