import { NextResponse } from "next/server";
import { requireAiMemberApi } from "@/lib/ai/access";
import { AI_MODEL_OPTIONS, DEFAULT_AI_MODEL } from "@/lib/ai/defaults";
import { aiErrorResponse, parseAiProvider } from "@/lib/ai/http";
import { ensureWorkspaceAi, getAiSettings } from "@/lib/ai/repository";
import { AI_PROVIDERS } from "@/lib/ai/types";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireAiMemberApi();
    ensureWorkspaceAi(workspace.id);
    const settings = getAiSettings(workspace.id)!;
    const providerParam = parseAiProvider(
      new URL(request.url).searchParams.get("provider"),
    );
    const provider = providerParam || settings.defaultProvider;

    return NextResponse.json({
      providers: AI_PROVIDERS,
      provider,
      defaults: DEFAULT_AI_MODEL,
      models: AI_MODEL_OPTIONS[provider] || [],
      allModels: AI_MODEL_OPTIONS,
      selectedModel:
        settings.defaultModel || DEFAULT_AI_MODEL[provider],
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
