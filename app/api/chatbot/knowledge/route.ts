import { NextResponse } from "next/server";
import {
  requireChatbotManagerApi,
  requireChatbotMemberApi,
} from "@/lib/chatbot/access";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  createFileKnowledgeSource,
  createWebsiteKnowledgeSource,
  deleteKnowledgeSource,
  listKnowledgeSources,
} from "@/lib/chatbot/repository";
import type { KnowledgeSourceType } from "@/lib/chatbot/types";

function detectFileType(
  fileName: string,
  mimeType: string,
): Exclude<KnowledgeSourceType, "website"> | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf") || mimeType === "application/pdf") return "pdf";
  if (
    lower.endsWith(".docx") ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (lower.endsWith(".txt") || mimeType.startsWith("text/plain")) return "txt";
  return null;
}

export async function GET(request: Request) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const botId = new URL(request.url).searchParams.get("botId") || undefined;
    return NextResponse.json({
      sources: listKnowledgeSources(workspace.id, botId),
    });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const botId = String(form.get("botId") || "");
      const title = String(form.get("title") || "");
      const file = form.get("file");
      if (!botId) {
        return NextResponse.json(
          { error: "botId is required." },
          { status: 400 },
        );
      }
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "file is required." },
          { status: 400 },
        );
      }
      const type = detectFileType(file.name, file.type || "");
      if (!type) {
        return NextResponse.json(
          { error: "Supported uploads: PDF, DOCX, TXT." },
          { status: 400 },
        );
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const source = await createFileKnowledgeSource({
        workspaceId: workspace.id,
        botId,
        title: title || file.name,
        type,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        bytes,
      });
      return NextResponse.json({ source }, { status: 201 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.botId !== "string" || !body.botId) {
      return NextResponse.json(
        { error: "botId is required." },
        { status: 400 },
      );
    }
    if (typeof body.sourceUrl !== "string" || !body.sourceUrl.trim()) {
      return NextResponse.json(
        { error: "sourceUrl is required for website sources." },
        { status: 400 },
      );
    }
    const source = await createWebsiteKnowledgeSource({
      workspaceId: workspace.id,
      botId: body.botId,
      title:
        typeof body.title === "string" && body.title.trim()
          ? body.title
          : body.sourceUrl,
      sourceUrl: body.sourceUrl,
    });
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { workspace } = await requireChatbotManagerApi();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }
    deleteKnowledgeSource(id, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
