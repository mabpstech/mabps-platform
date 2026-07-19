import type { AiToolDefinition, AiToolResult } from "@/lib/ai/types";

export type AiToolContext = {
  workspaceId: string;
  userId: string;
};

export type AiToolHandler = (
  ctx: AiToolContext,
  args: Record<string, unknown>,
) => Promise<AiToolResult> | AiToolResult;

export type AiRegisteredTool = AiToolDefinition & {
  handler: AiToolHandler;
};
