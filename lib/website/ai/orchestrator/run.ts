/**
 * Generation Orchestrator runner (AI Pipeline Phase 3).
 * Dispatches queued tasks to implemented generators — hero only for now.
 * Callers must go through the orchestrator; do not invoke generators directly from Builder/Editor.
 */

import { generateHero } from "@/lib/website/ai/generators/hero";
import { createGenerationPlan } from "@/lib/website/ai/orchestrator/engine";
import type {
  GenerationRunResult,
  GenerationTaskResult,
  RunGenerationPlanInput,
  RunGenerationPlanOptions,
} from "@/lib/website/ai/orchestrator/types";

/**
 * Execute a GenerationPlan through the orchestrator.
 * Phase 3: only the first `hero-generator` task produces content;
 * remaining hero tasks and all other generators are skipped.
 */
export async function runGenerationPlan(
  input: RunGenerationPlanInput,
  options: RunGenerationPlanOptions = {},
): Promise<GenerationRunResult> {
  if (!input.businessPlan) {
    throw new Error("businessPlan is required.");
  }
  if (!input.websitePlan) {
    throw new Error("websitePlan is required.");
  }

  const plan =
    input.plan ||
    createGenerationPlan({
      businessPlan: input.businessPlan,
      websitePlan: input.websitePlan,
    });

  const results: GenerationTaskResult[] = [];
  let hero: GenerationRunResult["hero"] = null;
  let heroMeta: GenerationRunResult["heroMeta"] = null;
  let heroGenerated = false;

  for (const task of plan.tasks) {
    if (task.generator === "hero-generator") {
      if (heroGenerated) {
        results.push({
          task,
          status: "skipped",
          skipReason:
            "Phase 3 generates a single Hero section; additional hero tasks are deferred.",
        });
        continue;
      }

      const generated = await generateHero(
        {
          businessPlan: input.businessPlan,
          websitePlan: input.websitePlan,
          task,
          workspaceId: input.workspaceId,
          apiKey: input.apiKey,
          baseUrl: input.baseUrl,
          model: input.model,
        },
        {
          skipLlm: options.skipLlm,
          completeJson: options.heroCompleteJson,
        },
      );

      console.info("[ai/hero] Hero generated from new pipeline", {
        task,
        content: generated.content,
        meta: generated.meta,
      });

      results.push({
        task,
        status: "generated",
        hero: generated.content,
        heroMeta: generated.meta,
      });

      hero = generated.content;
      heroMeta = generated.meta;
      heroGenerated = true;
      continue;
    }

    results.push({
      task,
      status: "skipped",
      skipReason: `generator "${task.generator}" is not implemented yet.`,
    });
  }

  return { plan, results, hero, heroMeta };
}
