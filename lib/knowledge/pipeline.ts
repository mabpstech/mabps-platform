import { createHash, randomUUID } from "node:crypto";
import { chunkText, estimateTokens } from "@/lib/knowledge/chunk";
import { crawlWebsite } from "@/lib/knowledge/crawl";
import { MAX_UPLOAD_BYTES } from "@/lib/knowledge/defaults";
import { getEmbeddingProvider } from "@/lib/knowledge/embeddings";
import { extractFileText } from "@/lib/knowledge/extract";
import {
  createSourceVersion,
  deleteChunksForVersion,
  getSourceById,
  getSourceForWorkspace,
  insertChunks,
  insertFileSourceRow,
  insertWebsiteSourceRow,
  markVersionError,
  markVersionReady,
  supersedeOlderVersions,
  updateSourceIndexingState,
} from "@/lib/knowledge/repository";
import { saveKnowledgeFile } from "@/lib/knowledge/storage";
import type { KbCrawlConfig, KbFileType, KbSource } from "@/lib/knowledge/types";
import { getVectorStore } from "@/lib/knowledge/vector";

function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function loadSourceText(source: KbSource): Promise<{
  text: string;
  metadata: Record<string, unknown>;
}> {
  if (source.type === "website") {
    if (!source.sourceUrl) throw new Error("Website URL is required.");
    const crawled = await crawlWebsite(source.sourceUrl, source.crawlConfig);
    return {
      text: crawled.combinedText,
      metadata: {
        pages: crawled.pages.map((page) => ({
          url: page.url,
          title: page.title,
          depth: page.depth,
          chars: page.text.length,
        })),
        pageCount: crawled.pages.length,
      },
    };
  }

  if (!source.storagePath) {
    throw new Error("Uploaded file is missing.");
  }

  const text = await extractFileText({
    type: source.type,
    storagePath: source.storagePath,
    workspaceId: source.workspaceId,
  });
  return {
    text,
    metadata: {
      fileName: source.fileName,
      mimeType: source.mimeType,
      byteSize: source.byteSize,
    },
  };
}

export async function indexKnowledgeSource(
  sourceId: string,
  options?: {
    embeddingProvider?: string | null;
    vectorStore?: string | null;
  },
): Promise<KbSource> {
  const source = getSourceById(sourceId);
  if (!source) throw new Error("Knowledge source not found.");

  const nextVersionNumber = source.currentVersion + 1;
  const version = createSourceVersion({
    sourceId: source.id,
    workspaceId: source.workspaceId,
    version: nextVersionNumber,
  });

  updateSourceIndexingState(source.id, {
    status: "processing",
    errorMessage: null,
    currentVersion: nextVersionNumber,
  });

  try {
    const loaded = await loadSourceText(source);
    const chunks = chunkText(loaded.text);
    if (!chunks.length) throw new Error("No text content found to index.");

    const hash = contentHash(loaded.text);
    const chunkRows = insertChunks({
      sourceId: source.id,
      versionId: version.id,
      workspaceId: source.workspaceId,
      chunks: chunks.map((content, chunkIndex) => ({
        content,
        tokenEstimate: estimateTokens(content),
        metadata: {
          chunkIndex,
          ...loaded.metadata,
        },
      })),
    });

    const embedder = getEmbeddingProvider(options?.embeddingProvider);
    const store = getVectorStore(options?.vectorStore);
    const embedded = await embedder.embed(chunkRows.map((row) => row.content));
    const timestamp = new Date().toISOString();

    await store.upsert(
      chunkRows.map((row, index) => ({
        id: randomUUID(),
        chunkId: row.id,
        sourceId: source.id,
        versionId: version.id,
        workspaceId: source.workspaceId,
        provider: embedded.provider,
        model: embedded.model,
        dimensions: embedded.dimensions,
        vector: embedded.vectors[index] || [],
        createdAt: timestamp,
      })),
    );

    markVersionReady({
      versionId: version.id,
      chunkCount: chunkRows.length,
      contentHash: hash,
    });
    supersedeOlderVersions(source.id, version.id);

    updateSourceIndexingState(source.id, {
      status: "ready",
      errorMessage: null,
      chunkCount: chunkRows.length,
      currentVersion: nextVersionNumber,
      lastIndexedAt: timestamp,
      metadata: loaded.metadata,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to index source.";
    deleteChunksForVersion(version.id);
    await getVectorStore(options?.vectorStore).deleteByVersion(
      version.id,
      source.workspaceId,
    );
    markVersionError(version.id, message);
    updateSourceIndexingState(source.id, {
      status: "error",
      errorMessage: message,
      currentVersion: source.currentVersion,
    });
  }

  const updated = getSourceById(sourceId);
  if (!updated) throw new Error("Knowledge source not found.");
  return updated;
}

export async function createFileSource(input: {
  workspaceId: string;
  title: string;
  type: KbFileType;
  originalName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<KbSource> {
  if (input.bytes.length <= 0 || input.bytes.length > MAX_UPLOAD_BYTES) {
    throw new Error("File must be between 1 byte and 12 MB.");
  }

  const saved = saveKnowledgeFile({
    workspaceId: input.workspaceId,
    originalName: input.originalName,
    bytes: input.bytes,
  });

  const source = insertFileSourceRow({
    workspaceId: input.workspaceId,
    title: input.title,
    type: input.type,
    originalName: input.originalName,
    mimeType: input.mimeType,
    storagePath: saved.storagePath,
    byteSize: input.bytes.length,
  });

  return indexKnowledgeSource(source.id);
}

export async function createWebsiteSource(input: {
  workspaceId: string;
  title: string;
  sourceUrl: string;
  crawlConfig?: KbCrawlConfig;
}): Promise<KbSource> {
  const url = input.sourceUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Website URL must start with http:// or https://.");
  }

  const source = insertWebsiteSourceRow({
    workspaceId: input.workspaceId,
    title: input.title,
    sourceUrl: url,
    crawlConfig: input.crawlConfig,
  });

  return indexKnowledgeSource(source.id);
}

export async function reindexSource(
  id: string,
  workspaceId: string,
): Promise<KbSource> {
  const source = getSourceForWorkspace(id, workspaceId);
  if (!source) throw new Error("Knowledge source not found.");
  return indexKnowledgeSource(source.id);
}
