import { platformErrorResponse } from "@/lib/platform/http";
import {
  AI_PROMPT_KINDS,
  AI_PROVIDERS,
  type AiPromptKind,
  type AiProviderId,
} from "@/lib/ai/types";

export function aiErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "ai",
    fallback: "Unexpected AI Assistant error.",
  });
}

export function parseAiListFilters(searchParams: URLSearchParams) {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  return {
    q: searchParams.get("q")?.trim() || undefined,
    kind: searchParams.get("kind")?.trim() || undefined,
    status: searchParams.get("status")?.trim() || undefined,
    provider: searchParams.get("provider")?.trim() || undefined,
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

export function parseAiProvider(value: unknown): AiProviderId | null {
  if (typeof value !== "string") return null;
  return AI_PROVIDERS.includes(value as AiProviderId)
    ? (value as AiProviderId)
    : null;
}

export function parseAiPromptKind(value: unknown): AiPromptKind | null {
  if (typeof value !== "string") return null;
  return AI_PROMPT_KINDS.includes(value as AiPromptKind)
    ? (value as AiPromptKind)
    : null;
}
