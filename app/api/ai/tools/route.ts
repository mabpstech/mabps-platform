import { NextResponse } from "next/server";
import { requireAiMemberApi } from "@/lib/ai/access";
import { aiErrorResponse } from "@/lib/ai/http";
import { ensureWorkspaceAi, getAiSettings } from "@/lib/ai/repository";
import { executeAiTool, listAiTools } from "@/lib/ai/tools";

export async function GET() {
  try {
    const { workspace } = await requireAiMemberApi();
    const settings = ensureWorkspaceAi(workspace.id);
    return NextResponse.json({
      toolsEnabled: settings.toolsEnabled,
      tools: listAiTools(),
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireAiMemberApi();
    const settings = getAiSettings(workspace.id) || ensureWorkspaceAi(workspace.id);
    if (!settings.toolsEnabled) {
      return NextResponse.json(
        { error: "AI tools are disabled for this workspace." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }

    const args =
      body.arguments && typeof body.arguments === "object"
        ? (body.arguments as Record<string, unknown>)
        : {};

    const result = await executeAiTool(
      { workspaceId: workspace.id, userId: session.user.id },
      body.name.trim(),
      args,
    );

    return NextResponse.json({ result });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
