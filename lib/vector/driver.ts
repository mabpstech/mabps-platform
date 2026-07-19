export type VectorStoreId = "sqlite" | "pgvector";

export function resolveVectorStoreId(
  preferred?: VectorStoreId | string | null,
): VectorStoreId {
  const requested = (
    preferred ||
    process.env.MABPS_KB_VECTOR_STORE ||
    "sqlite"
  )
    .trim()
    .toLowerCase();
  if (requested === "pgvector" || requested === "postgres" || requested === "pg") {
    return "pgvector";
  }
  return "sqlite";
}

export function listVectorStoreIds(): VectorStoreId[] {
  return ["sqlite", "pgvector"];
}
