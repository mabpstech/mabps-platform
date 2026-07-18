import { NextResponse } from "next/server";
import { requireKnowledgeMemberApi } from "@/lib/knowledge/access";
import { DEFAULT_CRAWL_CONFIG, SOURCE_TYPE_LABELS } from "@/lib/knowledge/defaults";
import { listEmbeddingProviders } from "@/lib/knowledge/embeddings";
import { knowledgeErrorResponse } from "@/lib/knowledge/http";
import { KB_SOURCE_STATUSES, KB_SOURCE_TYPES } from "@/lib/knowledge/types";
import { listVectorStores } from "@/lib/knowledge/vector";

export async function GET() {
  try {
    await requireKnowledgeMemberApi();
    return NextResponse.json({
      sourceTypes: KB_SOURCE_TYPES,
      sourceStatuses: KB_SOURCE_STATUSES,
      sourceTypeLabels: SOURCE_TYPE_LABELS,
      defaultCrawlConfig: DEFAULT_CRAWL_CONFIG,
      embeddingProviders: listEmbeddingProviders(),
      vectorStores: listVectorStores(),
    });
  } catch (error) {
    return knowledgeErrorResponse(error);
  }
}
