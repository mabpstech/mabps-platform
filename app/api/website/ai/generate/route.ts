import { NextResponse } from "next/server";
import { generateWebsiteFromPrompt } from "@/lib/website/ai/generation";
import { requireWebsiteManagerApi } from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import { AI_TEXT_LIMITS } from "@/lib/website/ai/helpers";

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const body = (await request.json()) as {
      prompt?: unknown;
      options?: {
        locale?: unknown;
        category?: unknown;
        template?: unknown;
        tone?: unknown;
      };
    };

    if (typeof body.prompt !== "string" || !body.prompt.trim()) {
      return NextResponse.json(
        { error: "A website prompt is required." },
        { status: 400 },
      );
    }

    if (body.prompt.trim().length > AI_TEXT_LIMITS.prompt) {
      return NextResponse.json(
        { error: `Prompt must be at most ${AI_TEXT_LIMITS.prompt} characters.` },
        { status: 400 },
      );
    }

    const result = await generateWebsiteFromPrompt({
      workspaceId: workspace.id,
      prompt: body.prompt,
    });

    return NextResponse.json(
      {
        siteId: result.siteId,
        builderHref: `/website/${result.siteId}/pages`,
        meta: {
          usedLlm: result.meta.usedLlm,
          llmFallback: result.meta.llmFallback,
          provider: result.meta.provider,
          model: result.meta.model,
        },
        site: {
          name: result.blueprint.site.name,
          slug: result.blueprint.site.slug,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
