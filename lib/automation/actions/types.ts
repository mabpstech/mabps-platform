import type { ActionResult, ActionType, TemplateContext } from "@/lib/automation/types";

export type ActionExecutionContext = {
  workspaceId: string;
  workflowId: string;
  runId: string;
  nodeId: string;
  context: TemplateContext;
};

export interface AutomationAction {
  id: ActionType;
  run(
    ctx: ActionExecutionContext,
    config: Record<string, unknown>,
  ): Promise<ActionResult>;
}
