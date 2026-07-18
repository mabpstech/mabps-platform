import { getAction } from "@/lib/automation/actions";
import { evaluateConditionGroup } from "@/lib/automation/engine/conditions";
import { computeDelayMs } from "@/lib/automation/engine/schedule";
import {
  buildTemplateContext,
  renderTemplate,
  resolveValue,
} from "@/lib/automation/engine/templates";
import {
  appendRunLog,
  claimQueueJobs,
  completeQueueJob,
  createRunStep,
  failQueueJob,
  getRunById,
  getWorkflowById,
  listRunSteps,
  rescheduleRun,
  updateRun,
  updateRunStep,
} from "@/lib/automation/repository";
import type {
  ActionNode,
  ConditionNode,
  DelayNode,
  WaitNode,
  WorkflowNode,
} from "@/lib/automation/types";

function nowIso(): string {
  return new Date().toISOString();
}

function nodeType(node: WorkflowNode): string {
  if (node.kind === "trigger") return node.type;
  if (node.kind === "action") return node.type;
  return node.type;
}

function findResumeIndex(
  definition: WorkflowNode[],
  currentNodeId: string | null,
  completedNodeIds: Set<string>,
): number {
  if (!currentNodeId) {
    const firstNonTrigger = definition.findIndex((node) => node.kind !== "trigger");
    return firstNonTrigger >= 0 ? firstNonTrigger : 0;
  }
  const idx = definition.findIndex((node) => node.id === currentNodeId);
  if (idx < 0) return 0;
  if (completedNodeIds.has(currentNodeId)) return idx + 1;
  return idx;
}

async function executeNode(
  node: WorkflowNode,
  runId: string,
  workspaceId: string,
  workflowId: string,
  context: ReturnType<typeof buildTemplateContext>,
): Promise<{
  status: "succeeded" | "failed" | "skipped" | "waiting";
  output: Record<string, unknown>;
  error?: string;
  waitUntil?: string;
  varsPatch?: Record<string, unknown>;
}> {
  const step = createRunStep({
    runId,
    workspaceId,
    workflowId,
    nodeId: node.id,
    nodeType: nodeType(node),
    nodeKind: node.kind,
    input: { config: "config" in node ? node.config : {} },
  });

  updateRunStep(step.id, {
    status: "running",
    startedAt: nowIso(),
    attempt: step.attempt + 1,
  });
  appendRunLog({
    runId,
    workspaceId,
    workflowId,
    runStepId: step.id,
    level: "info",
    message: `Executing ${node.kind} node "${node.name}"`,
    data: { nodeId: node.id, type: nodeType(node) },
  });

  try {
    if (node.kind === "trigger") {
      const output = { triggered: true, type: node.type };
      updateRunStep(step.id, {
        status: "succeeded",
        output,
        finishedAt: nowIso(),
      });
      return { status: "succeeded", output };
    }

    if (node.kind === "condition") {
      const conditionNode = node as ConditionNode;
      const passed = evaluateConditionGroup(conditionNode.config, context);
      const output = { passed, rules: conditionNode.config.rules.length };
      if (!passed) {
        updateRunStep(step.id, {
          status: "skipped",
          output,
          finishedAt: nowIso(),
        });
        appendRunLog({
          runId,
          workspaceId,
          workflowId,
          runStepId: step.id,
          level: "info",
          message: "Condition not met; remaining steps skipped.",
        });
        return { status: "skipped", output };
      }
      updateRunStep(step.id, {
        status: "succeeded",
        output,
        finishedAt: nowIso(),
      });
      return { status: "succeeded", output };
    }

    if (node.kind === "delay") {
      const delayNode = node as DelayNode;
      const ms = computeDelayMs(delayNode.config);
      if (ms > 0) {
        const waitUntil = new Date(Date.now() + ms).toISOString();
        updateRunStep(step.id, {
          status: "waiting",
          output: { waitUntil, ms },
          finishedAt: null,
        });
        appendRunLog({
          runId,
          workspaceId,
          workflowId,
          runStepId: step.id,
          level: "info",
          message: `Delay node waiting until ${waitUntil}`,
        });
        return { status: "waiting", output: { waitUntil, ms }, waitUntil };
      }
      updateRunStep(step.id, {
        status: "succeeded",
        output: { ms: 0 },
        finishedAt: nowIso(),
      });
      return { status: "succeeded", output: { ms: 0 } };
    }

    if (node.kind === "wait") {
      const waitNode = node as WaitNode;
      const untilRaw = waitNode.config.until
        ? renderTemplate(waitNode.config.until, context)
        : "";
      if (!untilRaw) {
        throw new Error("Wait node requires config.until.");
      }
      const waitUntil = new Date(untilRaw).toISOString();
      if (Number.isNaN(Date.parse(waitUntil))) {
        throw new Error("Wait node until value is not a valid date.");
      }
      if (Date.parse(waitUntil) > Date.now()) {
        updateRunStep(step.id, {
          status: "waiting",
          output: { waitUntil },
        });
        return { status: "waiting", output: { waitUntil }, waitUntil };
      }
      updateRunStep(step.id, {
        status: "succeeded",
        output: { waitUntil, resumed: true },
        finishedAt: nowIso(),
      });
      return { status: "succeeded", output: { waitUntil, resumed: true } };
    }

    if (node.kind === "action") {
      const actionNode = node as ActionNode;
      const action = getAction(actionNode.type);
      const result = await action.run(
        {
          workspaceId,
          workflowId,
          runId,
          nodeId: node.id,
          context,
        },
        actionNode.config,
      );

      if (!result.ok) {
        throw new Error(result.error || `Action ${actionNode.type} failed.`);
      }

      const output = result.output ?? {};
      let varsPatch: Record<string, unknown> | undefined;
      if (actionNode.type === "set_variable" && output.vars) {
        varsPatch = output.vars as Record<string, unknown>;
      }

      updateRunStep(step.id, {
        status: "succeeded",
        output,
        finishedAt: nowIso(),
      });
      appendRunLog({
        runId,
        workspaceId,
        workflowId,
        runStepId: step.id,
        level: "info",
        message: `Action ${actionNode.type} succeeded`,
        data: output,
      });
      return { status: "succeeded", output, varsPatch };
    }

    const unsupported = node as WorkflowNode;
    throw new Error(`Unsupported node kind: ${unsupported.kind}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Node failed.";
    updateRunStep(step.id, {
      status: "failed",
      errorMessage: message,
      finishedAt: nowIso(),
    });
    appendRunLog({
      runId,
      workspaceId,
      workflowId,
      runStepId: step.id,
      level: "error",
      message,
    });
    return { status: "failed", output: {}, error: message };
  }
}

export async function executeRun(runId: string): Promise<void> {
  const run = getRunById(runId);
  if (!run) throw new Error("Run not found.");
  if (run.status === "succeeded" || run.status === "cancelled") return;

  const workflow = getWorkflowById(run.workflowId);
  if (!workflow) throw new Error("Workflow not found.");

  const existingSteps = listRunSteps(runId);
  const completedNodeIds = new Set(
    existingSteps
      .filter((step) => step.status === "succeeded" || step.status === "skipped")
      .map((step) => step.nodeId),
  );

  // If a waiting step is ready, mark it succeeded before resuming.
  for (const step of existingSteps.filter((item) => item.status === "waiting")) {
    const waitUntil =
      typeof step.output.waitUntil === "string" ? step.output.waitUntil : null;
    if (waitUntil && Date.parse(waitUntil) <= Date.now()) {
      updateRunStep(step.id, {
        status: "succeeded",
        finishedAt: nowIso(),
        output: { ...step.output, resumed: true },
      });
      completedNodeIds.add(step.nodeId);
    } else if (waitUntil && Date.parse(waitUntil) > Date.now()) {
      updateRun(runId, {
        status: "waiting",
        currentNodeId: step.nodeId,
      });
      rescheduleRun(runId, waitUntil, { resumeFrom: step.nodeId });
      return;
    }
  }

  const contextState = {
    vars: (run.context.vars as Record<string, unknown>) ?? {},
    steps: (run.context.steps as Record<string, unknown>) ?? {},
  };

  for (const step of existingSteps) {
    if (step.status === "succeeded" || step.status === "skipped") {
      contextState.steps[step.nodeId] = step.output;
      if (step.output.vars && typeof step.output.vars === "object") {
        Object.assign(contextState.vars, step.output.vars);
      }
    }
  }

  updateRun(runId, {
    status: "running",
    startedAt: run.startedAt ?? nowIso(),
    attempt: run.attempt + 1,
    errorMessage: null,
  });

  const definition = workflow.definition;
  let index = findResumeIndex(definition, run.currentNodeId, completedNodeIds);

  while (index < definition.length) {
    const node = definition[index];
    if (completedNodeIds.has(node.id) && node.kind !== "trigger") {
      index += 1;
      continue;
    }

    // Skip re-running trigger if already present in history.
    if (node.kind === "trigger" && completedNodeIds.has(node.id)) {
      index += 1;
      continue;
    }

    updateRun(runId, { currentNodeId: node.id });

    const templateContext = buildTemplateContext({
      trigger: run.triggerPayload,
      vars: contextState.vars,
      steps: contextState.steps,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        workspaceId: workflow.workspaceId,
      },
      run: { id: run.id, attempt: run.attempt + 1 },
    });

    // Resolve action config templates once for logging clarity.
    if (node.kind === "action") {
      resolveValue(node.config, templateContext);
    }

    const result = await executeNode(
      node,
      runId,
      run.workspaceId,
      workflow.id,
      templateContext,
    );

    if (result.status === "waiting" && result.waitUntil) {
      updateRun(runId, {
        status: "waiting",
        currentNodeId: node.id,
        context: contextState,
      });
      rescheduleRun(runId, result.waitUntil, { resumeFrom: node.id });
      return;
    }

    if (result.status === "failed") {
      updateRun(runId, {
        status: "failed",
        errorMessage: result.error ?? "Run failed.",
        finishedAt: nowIso(),
        context: contextState,
        currentNodeId: node.id,
      });
      throw new Error(result.error ?? "Run failed.");
    }

    if (result.status === "skipped") {
      // Condition failed: stop remaining nodes.
      contextState.steps[node.id] = result.output;
      updateRun(runId, {
        status: "succeeded",
        finishedAt: nowIso(),
        context: contextState,
        currentNodeId: node.id,
      });
      appendRunLog({
        runId,
        workspaceId: run.workspaceId,
        workflowId: workflow.id,
        level: "info",
        message: "Run stopped after failed condition (treated as success).",
      });
      return;
    }

    contextState.steps[node.id] = result.output;
    if (result.varsPatch) {
      Object.assign(contextState.vars, result.varsPatch);
    }
    completedNodeIds.add(node.id);
    updateRun(runId, { context: contextState, currentNodeId: node.id });
    index += 1;
  }

  updateRun(runId, {
    status: "succeeded",
    finishedAt: nowIso(),
    context: contextState,
  });
  appendRunLog({
    runId,
    workspaceId: run.workspaceId,
    workflowId: workflow.id,
    level: "info",
    message: "Run completed successfully.",
  });
}

export async function processAutomationQueue(
  options: { limit?: number; workerId?: string } = {},
): Promise<{ processed: number; failed: number; claimed: number }> {
  const jobs = claimQueueJobs(options.limit ?? 10, options.workerId);
  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await executeRun(job.runId);
      const run = getRunById(job.runId);
      if (run?.status === "waiting") {
        completeQueueJob(job.id);
        processed += 1;
        continue;
      }
      if (run?.status === "failed") {
        failQueueJob(job.id, run.errorMessage || "Run failed.");
        failed += 1;
        // Re-queue the run itself for retry if attempts remain.
        if (run.attempt < run.maxAttempts) {
          const delay = Math.min(60_000, 2 ** run.attempt * 1000);
          rescheduleRun(
            run.id,
            new Date(Date.now() + delay).toISOString(),
            { retry: true },
          );
          updateRun(run.id, {
            status: "queued",
            finishedAt: null,
            errorMessage: run.errorMessage,
          });
        }
        continue;
      }
      completeQueueJob(job.id);
      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Queue job failed.";
      failQueueJob(job.id, message);
      failed += 1;
      const run = getRunById(job.runId);
      if (run && run.attempt < run.maxAttempts) {
        const delay = Math.min(60_000, 2 ** run.attempt * 1000);
        rescheduleRun(
          run.id,
          new Date(Date.now() + delay).toISOString(),
          { retry: true },
        );
        updateRun(run.id, {
          status: "queued",
          finishedAt: null,
          errorMessage: message,
        });
      } else if (run) {
        updateRun(run.id, {
          status: "failed",
          errorMessage: message,
          finishedAt: nowIso(),
        });
      }
    }
  }

  return { processed, failed, claimed: jobs.length };
}
