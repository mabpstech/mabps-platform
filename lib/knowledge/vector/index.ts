import { createSqliteVectorStore } from "@/lib/knowledge/vector/sqlite";
import type { VectorStore } from "@/lib/knowledge/vector/types";

export type {
  VectorRecord,
  VectorSearchHit,
  VectorStore,
  VectorUpsertInput,
} from "@/lib/knowledge/vector/types";

export type VectorStoreId = "sqlite";

export function listVectorStores(): VectorStoreId[] {
  return ["sqlite"];
}

export function getVectorStore(
  preferred?: VectorStoreId | string | null,
): VectorStore {
  const requested =
    preferred || process.env.MABPS_KB_VECTOR_STORE || "sqlite";
  if (requested === "sqlite") {
    return createSqliteVectorStore();
  }
  return createSqliteVectorStore();
}
