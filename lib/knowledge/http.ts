import { NextResponse } from "next/server";
import { KnowledgeAuthError } from "@/lib/knowledge/access";

export function knowledgeErrorResponse(error: unknown) {
  if (error instanceof KnowledgeAuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected Knowledge Base error.";

  let status = 400;
  if (
    message.includes("Authentication required") ||
    message.includes("Unauthorized")
  ) {
    status = 401;
  } else if (
    message.includes("not found") ||
    message.includes("Not found")
  ) {
    status = 404;
  } else if (
    message.includes("Plan limit") ||
    message.includes("plan allows") ||
    message.includes("Upgrade to continue")
  ) {
    status = 402;
  } else if (message.includes("not implemented")) {
    status = 501;
  }

  console.error("[knowledge]", error);
  return NextResponse.json({ error: message }, { status });
}

export function parseKnowledgeListFilters(searchParams: URLSearchParams) {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  return {
    q: searchParams.get("q")?.trim() || undefined,
    status: searchParams.get("status")?.trim() || undefined,
    type: searchParams.get("type")?.trim() || undefined,
    limit:
      typeof limit === "number" && Number.isFinite(limit)
        ? Math.min(Math.max(1, Math.floor(limit)), 500)
        : undefined,
    offset:
      typeof offset === "number" && Number.isFinite(offset)
        ? Math.max(0, Math.floor(offset))
        : undefined,
  };
}

export function detectFileType(
  fileName: string,
  mimeType: string,
): "pdf" | "docx" | "txt" | "markdown" | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf") || mimeType === "application/pdf") return "pdf";
  if (
    lower.endsWith(".docx") ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (
    lower.endsWith(".md") ||
    lower.endsWith(".markdown") ||
    mimeType === "text/markdown" ||
    mimeType === "text/x-markdown"
  ) {
    return "markdown";
  }
  if (lower.endsWith(".txt") || mimeType.startsWith("text/plain")) return "txt";
  return null;
}
