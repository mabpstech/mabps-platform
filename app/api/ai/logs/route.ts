import { NextResponse } from "next/server";
import { requireAiMemberApi } from "@/lib/ai/access";
import { aiErrorResponse, parseAiListFilters } from "@/lib/ai/http";
import { ensureWorkspaceAi, listAiLogs } from "@/lib/ai/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireAiMemberApi();
    ensureWorkspaceAi(workspace.id);
    const filters = parseAiListFilters(new URL(request.url).searchParams);
    return NextResponse.json({
      logs: listAiLogs(workspace.id, filters),
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
