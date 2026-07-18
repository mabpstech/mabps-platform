import { NextResponse } from "next/server";
import { requireKnowledgeMemberApi } from "@/lib/knowledge/access";
import { knowledgeErrorResponse } from "@/lib/knowledge/http";
import { searchKnowledge } from "@/lib/knowledge/search";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireKnowledgeMemberApi();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const sourceIds = searchParams
      .getAll("sourceId")
      .map((value) => value.trim())
      .filter(Boolean);

    const result = await searchKnowledge({
      workspaceId: workspace.id,
      query,
      limit,
      sourceIds: sourceIds.length ? sourceIds : undefined,
      embeddingProvider: searchParams.get("embeddingProvider"),
      vectorStore: searchParams.get("vectorStore"),
    });

    return NextResponse.json({ result });
  } catch (error) {
    return knowledgeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireKnowledgeMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    const query =
      typeof body.query === "string"
        ? body.query
        : typeof body.q === "string"
          ? body.q
          : "";
    const sourceIds = Array.isArray(body.sourceIds)
      ? body.sourceIds.filter((value): value is string => typeof value === "string")
      : undefined;

    const result = await searchKnowledge({
      workspaceId: workspace.id,
      query,
      limit: typeof body.limit === "number" ? body.limit : undefined,
      sourceIds,
      embeddingProvider:
        typeof body.embeddingProvider === "string"
          ? body.embeddingProvider
          : null,
      vectorStore:
        typeof body.vectorStore === "string" ? body.vectorStore : null,
    });

    return NextResponse.json({ result });
  } catch (error) {
    return knowledgeErrorResponse(error);
  }
}
