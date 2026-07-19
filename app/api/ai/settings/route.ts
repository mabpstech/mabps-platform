import { NextResponse } from "next/server";
import {
  requireAiManagerApi,
  requireAiMemberApi,
} from "@/lib/ai/access";
import { aiErrorResponse, parseAiProvider } from "@/lib/ai/http";
import {
  ensureWorkspaceAi,
  getAiSettings,
  updateAiSettings,
} from "@/lib/ai/repository";

export async function GET() {
  try {
    const { workspace } = await requireAiMemberApi();
    return NextResponse.json({
      settings: ensureWorkspaceAi(workspace.id),
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { workspace } = await requireAiManagerApi();
    ensureWorkspaceAi(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    const provider =
      body.defaultProvider !== undefined
        ? parseAiProvider(body.defaultProvider)
        : undefined;
    if (body.defaultProvider !== undefined && !provider) {
      return NextResponse.json(
        { error: "defaultProvider must be openai, gemini, or openrouter." },
        { status: 400 },
      );
    }

    const settings = updateAiSettings(workspace.id, {
      defaultProvider: provider || undefined,
      defaultModel:
        typeof body.defaultModel === "string" || body.defaultModel === null
          ? (body.defaultModel as string | null)
          : undefined,
      temperature:
        typeof body.temperature === "number" ? body.temperature : undefined,
      streamingEnabled:
        typeof body.streamingEnabled === "boolean"
          ? body.streamingEnabled
          : undefined,
      toolsEnabled:
        typeof body.toolsEnabled === "boolean" ? body.toolsEnabled : undefined,
      systemPromptId:
        typeof body.systemPromptId === "string" || body.systemPromptId === null
          ? (body.systemPromptId as string | null)
          : undefined,
      maxToolRounds:
        typeof body.maxToolRounds === "number" ? body.maxToolRounds : undefined,
    });

    return NextResponse.json({ settings: getAiSettings(workspace.id) || settings });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
