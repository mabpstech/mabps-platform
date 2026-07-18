export * from "@/lib/knowledge/types";
export { migrateKnowledgeSchema } from "@/lib/knowledge/migrate";
export {
  ensureKnowledgeReady,
  getKnowledgeOverview,
  listSources,
  getSourceById,
  getSourceForWorkspace,
  listSourceVersions,
  getVersionById,
  getChunkById,
  listChunksForSource,
  listChunksForVersions,
  listActiveVersionIds,
  deleteSource,
  updateSourceMeta,
} from "@/lib/knowledge/repository";
export {
  createFileSource,
  createWebsiteSource,
  reindexSource,
  indexKnowledgeSource,
} from "@/lib/knowledge/pipeline";
export {
  searchKnowledge,
  formatKnowledgeContext,
} from "@/lib/knowledge/search";
export {
  searchKnowledgeForChatbot,
  searchKnowledgeForAutomation,
} from "@/lib/knowledge/consumers";
export {
  getEmbeddingProvider,
  listEmbeddingProviders,
} from "@/lib/knowledge/embeddings";
export { getVectorStore, listVectorStores } from "@/lib/knowledge/vector";
export { SOURCE_TYPE_LABELS, DEFAULT_CRAWL_CONFIG } from "@/lib/knowledge/defaults";
