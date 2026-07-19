import { platformErrorResponse } from "@/lib/platform/http";

export function knowledgeErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "knowledge",
    fallback: "Unexpected Knowledge Base error.",
  });
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
