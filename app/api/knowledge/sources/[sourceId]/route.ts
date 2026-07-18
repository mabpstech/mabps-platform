import { NextResponse } from "next/server";
import {
  requireKnowledgeManagerApi,
  requireKnowledgeMemberApi,
} from "@/lib/knowledge/access";
import { knowledgeErrorResponse } from "@/lib/knowledge/http";
import {
  deleteSource,
  getSourceForWorkspace,
  listChunksForSource,
  listSourceVersions,
  updateSourceMeta,
} from "@/lib/knowledge/repository";
import type { KbCrawlConfig } from "@/lib/knowledge/types";

type RouteContext = {
  params: Promise<{ sourceId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireKnowledgeMemberApi();
    const { sourceId } = await context.params;
    const source = getSourceForWorkspace(sourceId, workspace.id);
    if (!source) {
      return NextResponse.json(
        { error: "Knowledge source not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({
      source,
      versions: listSourceVersions(source.id),
      chunks: listChunksForSource(source.id),
    });
  } catch (error) {
    return knowledgeErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireKnowledgeMemberApi();
    const { sourceId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const crawlConfig: KbCrawlConfig | undefined =
      body.crawlConfig && typeof body.crawlConfig === "object"
        ? (body.crawlConfig as KbCrawlConfig)
        : undefined;
    const source = updateSourceMeta(sourceId, workspace.id, {
      title: typeof body.title === "string" ? body.title : undefined,
      crawlConfig,
    });
    return NextResponse.json({ source });
  } catch (error) {
    return knowledgeErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireKnowledgeManagerApi();
    const { sourceId } = await context.params;
    await deleteSource(sourceId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return knowledgeErrorResponse(error);
  }
}
