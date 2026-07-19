import { DEFAULT_SYSTEM_PROMPT, DEFAULT_WORKSPACE_PROMPT } from "@/lib/ai/defaults";
import { resolveActivePrompts } from "@/lib/ai/repository";
import type { AiChatMessage } from "@/lib/ai/types";

export function buildAssistantSystemMessages(
  workspaceId: string,
  workspaceName?: string,
): AiChatMessage[] {
  const { system, workspace } = resolveActivePrompts(workspaceId);
  const messages: AiChatMessage[] = [
    {
      role: "system",
      content: system?.content || DEFAULT_SYSTEM_PROMPT,
    },
  ];

  const workspaceContent = [
    workspace?.content || DEFAULT_WORKSPACE_PROMPT,
    workspaceName ? `Active workspace name: ${workspaceName}.` : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (workspaceContent.trim()) {
    messages.push({
      role: "system",
      content: workspaceContent,
    });
  }

  return messages;
}
