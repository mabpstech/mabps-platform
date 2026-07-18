export const MEMORY_KINDS = [
  "short_term",
  "long_term",
  "profile",
  "business",
] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export const MEMORY_SCOPE_TYPES = [
  "workspace",
  "visitor",
  "conversation",
  "contact",
  "bot",
  "user",
] as const;
export type MemoryScopeType = (typeof MEMORY_SCOPE_TYPES)[number];

export const MEMORY_SOURCES = [
  "api",
  "chatbot",
  "automation",
  "merge",
  "system",
  "import",
] as const;
export type MemorySource = (typeof MEMORY_SOURCES)[number] | string;

export type MemoryEntry = {
  id: string;
  workspaceId: string;
  kind: MemoryKind;
  scopeType: MemoryScopeType;
  scopeId: string | null;
  key: string | null;
  content: string;
  importance: number;
  score: number;
  source: string;
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
  mergedIntoId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemorySearchHit = {
  memory: MemoryEntry;
  score: number;
  semanticScore: number;
  lexicalScore: number;
  importance: number;
  recencyBoost: number;
};

export type MemorySearchResult = {
  query: string;
  hits: MemorySearchHit[];
  provider: string;
  model: string;
  limit: number;
};

export type MemoryOverviewStats = {
  total: number;
  shortTerm: number;
  longTerm: number;
  profile: number;
  business: number;
  expired: number;
  merged: number;
  avgImportance: number;
};

export type MemoryListFilters = {
  q?: string;
  kind?: string;
  scopeType?: string;
  scopeId?: string;
  key?: string;
  includeExpired?: boolean;
  includeMerged?: boolean;
  limit?: number;
  offset?: number;
};

export type MemoryWriteInput = {
  workspaceId: string;
  kind: MemoryKind;
  content: string;
  scopeType?: MemoryScopeType;
  scopeId?: string | null;
  key?: string | null;
  importance?: number;
  source?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
  /** When true, upsert by workspace+kind+scope+key if key is set. */
  upsertByKey?: boolean;
};

export type MemoryEmbeddingRecord = {
  id: string;
  memoryId: string;
  workspaceId: string;
  provider: string;
  model: string;
  dimensions: number;
  vector: number[];
  createdAt: string;
};
