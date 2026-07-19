import { platformErrorResponse } from "@/lib/platform/http";

export function chatbotErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "chatbot",
    fallback: "Unexpected Chatbot error.",
  });
}

export function parseChatbotListFilters(searchParams: URLSearchParams) {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  return {
    q: searchParams.get("q")?.trim() || undefined,
    status: searchParams.get("status")?.trim() || undefined,
    channel: searchParams.get("channel")?.trim() || undefined,
    botId: searchParams.get("botId")?.trim() || undefined,
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
