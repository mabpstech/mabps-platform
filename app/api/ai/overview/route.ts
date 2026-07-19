import { NextResponse } from "next/server";
import { requireAiMemberApi } from "@/lib/ai/access";
import { aiErrorResponse } from "@/lib/ai/http";
import { ensureWorkspaceAi, getAiOverview } from "@/lib/ai/repository";

export async function GET() {
  try {
    const { workspace } = await requireAiMemberApi();
    ensureWorkspaceAi(workspace.id);
    return NextResponse.json({ overview: getAiOverview(workspace.id) });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
