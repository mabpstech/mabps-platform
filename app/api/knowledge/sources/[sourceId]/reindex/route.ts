import { NextResponse } from "next/server";
import { requireKnowledgeMemberApi } from "@/lib/knowledge/access";
import { knowledgeErrorResponse } from "@/lib/knowledge/http";
import { reindexSource } from "@/lib/knowledge/pipeline";

type RouteContext = {
  params: Promise<{ sourceId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireKnowledgeMemberApi();
    const { sourceId } = await context.params;
    const source = await reindexSource(sourceId, workspace.id);
    return NextResponse.json({ source });
  } catch (error) {
    return knowledgeErrorResponse(error);
  }
}
