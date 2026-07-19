import { createPgvectorStore } from "@/lib/knowledge/vector/pgvector";
import { createSqliteVectorStore } from "@/lib/knowledge/vector/sqlite";
import type { VectorStore } from "@/lib/knowledge/vector/types";
import {
  listVectorStoreIds,
  resolveVectorStoreId,
  type VectorStoreId,
} from "@/lib/vector/driver";

export type {
  VectorRecord,
  VectorSearchHit,
  VectorStore,
  VectorUpsertInput,
} from "@/lib/knowledge/vector/types";

export type { VectorStoreId };
export { listVectorStoreIds as listVectorStores, resolveVectorStoreId };

export function getVectorStore(
  preferred?: VectorStoreId | string | null,
): VectorStore {
  const id = resolveVectorStoreId(preferred);
  if (id === "pgvector") {
    return createPgvectorStore();
  }
  return createSqliteVectorStore();
}
