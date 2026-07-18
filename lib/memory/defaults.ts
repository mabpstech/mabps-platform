import type { MemoryKind, MemoryScopeType } from "@/lib/memory/types";

/** Default importance by memory kind (0–1). */
export const DEFAULT_IMPORTANCE: Record<MemoryKind, number> = {
  short_term: 0.35,
  long_term: 0.65,
  profile: 0.85,
  business: 0.75,
};

/** Default TTL in milliseconds. null = never expires. */
export const DEFAULT_TTL_MS: Record<MemoryKind, number | null> = {
  short_term: 24 * 60 * 60 * 1000,
  long_term: 365 * 24 * 60 * 60 * 1000,
  profile: null,
  business: null,
};

export const KIND_LABELS: Record<MemoryKind, string> = {
  short_term: "Short-term",
  long_term: "Long-term",
  profile: "User profile",
  business: "Business",
};

export const SCOPE_LABELS: Record<MemoryScopeType, string> = {
  workspace: "Workspace",
  visitor: "Visitor",
  conversation: "Conversation",
  contact: "Contact",
  bot: "Bot",
  user: "User",
};

export const DEFAULT_SCOPE_FOR_KIND: Record<MemoryKind, MemoryScopeType> = {
  short_term: "conversation",
  long_term: "visitor",
  profile: "visitor",
  business: "workspace",
};

export const MAX_MEMORY_CONTENT_CHARS = 8_000;
export const DEFAULT_SEARCH_LIMIT = 8;
export const MERGE_SIMILARITY_THRESHOLD = 0.82;
