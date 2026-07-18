import { NextResponse } from "next/server";
import { listEmbeddingProviders } from "@/lib/knowledge/embeddings";
import {
  DEFAULT_IMPORTANCE,
  DEFAULT_TTL_MS,
  KIND_LABELS,
  SCOPE_LABELS,
} from "@/lib/memory/defaults";
import { requireMemoryMemberApi } from "@/lib/memory/access";
import { memoryErrorResponse } from "@/lib/memory/http";
import { MEMORY_KINDS, MEMORY_SCOPE_TYPES } from "@/lib/memory/types";

export async function GET() {
  try {
    await requireMemoryMemberApi();
    return NextResponse.json({
      kinds: MEMORY_KINDS,
      scopeTypes: MEMORY_SCOPE_TYPES,
      kindLabels: KIND_LABELS,
      scopeLabels: SCOPE_LABELS,
      defaultImportance: DEFAULT_IMPORTANCE,
      defaultTtlMs: DEFAULT_TTL_MS,
      embeddingProviders: listEmbeddingProviders(),
    });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
