import { NextResponse } from "next/server";
import { ChatbotAuthError } from "@/lib/chatbot/access";

export function chatbotErrorResponse(error: unknown) {
  if (error instanceof ChatbotAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message =
    error instanceof Error ? error.message : "Unexpected Chatbot error.";

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

  console.error("[chatbot]", error);
  return NextResponse.json({ error: message }, { status });
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
