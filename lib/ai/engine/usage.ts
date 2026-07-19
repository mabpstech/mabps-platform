import { recordAiUsage, recordAnalyticsEvent } from "@/lib/analytics/consumers";
import { currentPeriodKey, estimateCredits } from "@/lib/ai/defaults";
import { createAiLog } from "@/lib/ai/repository";
import type { AiLogStatus } from "@/lib/ai/types";
import {
  assertWithinLimit,
  checkLimit,
} from "@/lib/billing/entitlements";
import { incrementUsageValue } from "@/lib/billing/repository";

export function assertAiCreditsAvailable(
  workspaceId: string,
  credits = 1,
): void {
  assertWithinLimit(workspaceId, "aiCredits", { delta: credits });
}

export function recordAssistantUsage(input: {
  workspaceId: string;
  userId?: string | null;
  conversationId?: string | null;
  provider: string;
  model: string;
  operation?: string;
  status?: AiLogStatus;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number | null;
  errorMessage?: string | null;
  requestSummary?: string | null;
  responseSummary?: string | null;
  toolNames?: string[];
  metadata?: Record<string, unknown>;
}) {
  const inputTokens = input.inputTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  const totalTokens = input.totalTokens ?? inputTokens + outputTokens;
  const estimatedCredits =
    input.status === "error" ? 0 : estimateCredits(totalTokens || 1);
  const status = input.status ?? "success";
  let credits = 0;

  if (status === "success" && estimatedCredits > 0) {
    const limit = checkLimit(input.workspaceId, "aiCredits", {
      delta: estimatedCredits,
    });
    // Charge what remains if the estimated cost exceeds the hard limit mid-request.
    credits = limit.allowed
      ? estimatedCredits
      : Math.max(0, limit.remaining ?? 0);
    if (credits > 0) {
      incrementUsageValue(
        input.workspaceId,
        "aiCredits",
        currentPeriodKey(),
        credits,
      );
    }
  }

  const log = createAiLog({
    workspaceId: input.workspaceId,
    conversationId: input.conversationId,
    userId: input.userId,
    provider: input.provider,
    model: input.model,
    operation: input.operation ?? "chat",
    status,
    inputTokens,
    outputTokens,
    totalTokens,
    credits,
    latencyMs: input.latencyMs,
    errorMessage: input.errorMessage,
    requestSummary: input.requestSummary,
    responseSummary: input.responseSummary,
    toolNames: input.toolNames,
    metadata: input.metadata,
  });

  try {
    recordAiUsage({
      workspaceId: input.workspaceId,
      provider: input.provider,
      model: input.model,
      operation: input.operation ?? "assistant_chat",
      inputTokens,
      outputTokens,
      totalTokens,
      credits,
      success: status === "success",
      entityType: "ai_conversation",
      entityId: input.conversationId ?? null,
      userId: input.userId ?? null,
      metadata: {
        toolNames: input.toolNames ?? [],
        ...(input.metadata ?? {}),
      },
    });
    recordAnalyticsEvent({
      workspaceId: input.workspaceId,
      source: "ai",
      name: status === "success" ? "assistant_chat" : "assistant_chat_error",
      userId: input.userId ?? null,
      entityType: "ai_conversation",
      entityId: input.conversationId ?? null,
      value: credits,
      unit: "credits",
      properties: {
        provider: input.provider,
        model: input.model,
        totalTokens,
      },
    });
  } catch {
    // Analytics should not block assistant responses.
  }

  return log;
}
