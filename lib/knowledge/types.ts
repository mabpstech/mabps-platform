export const KB_SOURCE_TYPES = [
  "pdf",
  "docx",
  "txt",
  "markdown",
  "website",
] as const;
export type KbSourceType = (typeof KB_SOURCE_TYPES)[number];

export const KB_FILE_TYPES = ["pdf", "docx", "txt", "markdown"] as const;
export type KbFileType = (typeof KB_FILE_TYPES)[number];

export const KB_SOURCE_STATUSES = [
  "pending",
  "processing",
  "ready",
  "error",
] as const;
export type KbSourceStatus = (typeof KB_SOURCE_STATUSES)[number];

export const KB_VERSION_STATUSES = [
  "pending",
  "processing",
  "ready",
  "error",
  "superseded",
] as const;
export type KbVersionStatus = (typeof KB_VERSION_STATUSES)[number];

export type KbCrawlConfig = {
  maxPages?: number;
  maxDepth?: number;
  sameOriginOnly?: boolean;
};

export type KbSource = {
  id: string;
  workspaceId: string;
  type: KbSourceType;
  title: string;
  status: KbSourceStatus;
  sourceUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  storagePath: string | null;
  byteSize: number;
  errorMessage: string | null;
  chunkCount: number;
  currentVersion: number;
  crawlConfig: KbCrawlConfig;
  metadata: Record<string, unknown>;
  lastIndexedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KbSourceVersion = {
  id: string;
  sourceId: string;
  workspaceId: string;
  version: number;
  status: KbVersionStatus;
  chunkCount: number;
  contentHash: string | null;
  errorMessage: string | null;
  createdAt: string;
  indexedAt: string | null;
};

export type KbChunk = {
  id: string;
  sourceId: string;
  versionId: string;
  workspaceId: string;
  chunkIndex: number;
  content: string;
  tokenEstimate: number;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type KbSearchHit = {
  chunk: KbChunk;
  score: number;
  sourceId: string;
  sourceTitle: string;
  sourceType: KbSourceType;
  version: number;
};

export type KbSearchResult = {
  query: string;
  hits: KbSearchHit[];
  provider: string;
  model: string;
  limit: number;
};

export type KbOverviewStats = {
  sources: number;
  readySources: number;
  errorSources: number;
  chunks: number;
  versions: number;
  websites: number;
  files: number;
};

export type KbListFilters = {
  q?: string;
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
};

export type KbEmbeddingRecord = {
  id: string;
  chunkId: string;
  sourceId: string;
  versionId: string;
  workspaceId: string;
  provider: string;
  model: string;
  dimensions: number;
  vector: number[];
  createdAt: string;
};
