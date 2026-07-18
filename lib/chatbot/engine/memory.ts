import { extractLeadHints } from "@/lib/chatbot/engine/leads";
import {
  listMemory,
  upsertMemory,
} from "@/lib/chatbot/repository";
import {
  rememberForChatbot,
  retrieveMemoryForChatbot,
} from "@/lib/memory";
import type { ChatbotMemory } from "@/lib/chatbot/types";

export function rememberFromUserText(input: {
  botId: string;
  workspaceId: string;
  visitorKey: string;
  text: string;
}): ChatbotMemory[] {
  const hints = extractLeadHints(input.text);
  const saved: ChatbotMemory[] = [];

  if (hints.name) {
    saved.push(
      upsertMemory({
        botId: input.botId,
        workspaceId: input.workspaceId,
        visitorKey: input.visitorKey,
        key: "name",
        value: hints.name,
      }),
    );
  }
  if (hints.email) {
    saved.push(
      upsertMemory({
        botId: input.botId,
        workspaceId: input.workspaceId,
        visitorKey: input.visitorKey,
        key: "email",
        value: hints.email,
      }),
    );
  }
  if (hints.phone) {
    saved.push(
      upsertMemory({
        botId: input.botId,
        workspaceId: input.workspaceId,
        visitorKey: input.visitorKey,
        key: "phone",
        value: hints.phone,
      }),
    );
  }

  return saved;
}

/**
 * Persist chatbot facts into the workspace Memory Engine (async).
 */
export async function rememberWithMemoryEngine(input: {
  botId: string;
  workspaceId: string;
  visitorKey: string;
  conversationId: string;
  text: string;
}) {
  const hints = extractLeadHints(input.text);
  const facts: Array<{ key: string; value: string; kind: "profile" }> = [];
  if (hints.name) facts.push({ key: "name", value: hints.name, kind: "profile" });
  if (hints.email) {
    facts.push({ key: "email", value: hints.email, kind: "profile" });
  }
  if (hints.phone) {
    facts.push({ key: "phone", value: hints.phone, kind: "profile" });
  }

  return rememberForChatbot({
    workspaceId: input.workspaceId,
    botId: input.botId,
    visitorKey: input.visitorKey,
    conversationId: input.conversationId,
    text: input.text,
    facts,
  });
}

export function formatMemoryForPrompt(
  botId: string,
  visitorKey: string | null | undefined,
): string {
  if (!visitorKey) return "";
  const memories = listMemory(botId, visitorKey);
  if (!memories.length) return "";
  return memories.map((item) => `- ${item.key}: ${item.value}`).join("\n");
}

export async function formatEngineMemoryForPrompt(input: {
  workspaceId: string;
  query: string;
  visitorKey?: string | null;
  conversationId?: string | null;
}): Promise<string> {
  const result = await retrieveMemoryForChatbot({
    workspaceId: input.workspaceId,
    query: input.query,
    visitorKey: input.visitorKey,
    conversationId: input.conversationId,
    limit: 8,
  });
  return result.context;
}
