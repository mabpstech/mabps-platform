import { NextResponse } from "next/server";
import { requireKnowledgeMemberApi } from "@/lib/knowledge/access";
import { knowledgeErrorResponse } from "@/lib/knowledge/http";
import { getKnowledgeOverview } from "@/lib/knowledge/repository";

export async function GET() {
  try {
    const { workspace } = await requireKnowledgeMemberApi();
    return NextResponse.json({
      overview: getKnowledgeOverview(workspace.id),
    });
  } catch (error) {
    return knowledgeErrorResponse(error);
  }
}
