import { extractLeadHints } from "@/lib/chatbot/engine/leads";
import {
  listMemory,
  upsertMemory,
} from "@/lib/chatbot/repository";
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

export function formatMemoryForPrompt(
  botId: string,
  visitorKey: string | null | undefined,
): string {
  if (!visitorKey) return "";
  const memories = listMemory(botId, visitorKey);
  if (!memories.length) return "";
  return memories.map((item) => `- ${item.key}: ${item.value}`).join("\n");
}
