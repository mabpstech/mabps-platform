import { NextResponse } from "next/server";
import {
  requireKnowledgeManagerApi,
  requireKnowledgeMemberApi,
} from "@/lib/knowledge/access";
import {
  detectFileType,
  knowledgeErrorResponse,
  parseKnowledgeListFilters,
} from "@/lib/knowledge/http";
import {
  createFileSource,
  createWebsiteSource,
} from "@/lib/knowledge/pipeline";
import { listSources } from "@/lib/knowledge/repository";
import type { KbCrawlConfig } from "@/lib/knowledge/types";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireKnowledgeMemberApi();
    const filters = parseKnowledgeListFilters(new URL(request.url).searchParams);
    return NextResponse.json({
      sources: listSources(workspace.id, filters),
    });
  } catch (error) {
    return knowledgeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireKnowledgeMemberApi();
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const title = String(form.get("title") || "");
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "file is required." },
          { status: 400 },
        );
      }
      const type = detectFileType(file.name, file.type || "");
      if (!type) {
        return NextResponse.json(
          { error: "Supported uploads: PDF, DOCX, TXT, Markdown." },
          { status: 400 },
        );
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const source = await createFileSource({
        workspaceId: workspace.id,
        title: title || file.name,
        type,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        bytes,
      });
      return NextResponse.json({ source }, { status: 201 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.sourceUrl !== "string" || !body.sourceUrl.trim()) {
      return NextResponse.json(
        { error: "sourceUrl is required for website sources." },
        { status: 400 },
      );
    }

    const crawlConfig: KbCrawlConfig = {};
    if (body.crawlConfig && typeof body.crawlConfig === "object") {
      const cfg = body.crawlConfig as Record<string, unknown>;
      if (typeof cfg.maxPages === "number") crawlConfig.maxPages = cfg.maxPages;
      if (typeof cfg.maxDepth === "number") crawlConfig.maxDepth = cfg.maxDepth;
      if (typeof cfg.sameOriginOnly === "boolean") {
        crawlConfig.sameOriginOnly = cfg.sameOriginOnly;
      }
    }

    const source = await createWebsiteSource({
      workspaceId: workspace.id,
      title:
        typeof body.title === "string" && body.title.trim()
          ? body.title
          : body.sourceUrl,
      sourceUrl: body.sourceUrl,
      crawlConfig,
    });
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    return knowledgeErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { workspace } = await requireKnowledgeManagerApi();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }
    const { deleteSource } = await import("@/lib/knowledge/repository");
    await deleteSource(id, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return knowledgeErrorResponse(error);
  }
}
