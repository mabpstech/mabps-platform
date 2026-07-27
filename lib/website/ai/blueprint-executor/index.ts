/**
 * Blueprint Executor (Sprint B1).
 * AiWebsiteBlueprint → Website Builder project via existing repositories/services.
 */

export type {
  AiBlueprintExecuteInput,
  AiBlueprintExecuteResult,
} from "@/lib/website/ai/blueprint-executor/types";

export {
  executeWebsiteBlueprint,
  executeWebsiteBlueprintOnSite,
} from "@/lib/website/ai/blueprint-executor/engine";
