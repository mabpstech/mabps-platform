/**
 * Website Planning providers (Sprint C5).
 * Deterministic provider ships now; registry supports future AI adapters.
 */

import { inferWebsitePlan } from "@/lib/website/ai/website-plan/engine";
import type {
  AiWebsitePlanInput,
  AiWebsitePlanProvider,
  AiWebsitePlanProviderId,
  AiWebsitePlanResult,
} from "@/lib/website/ai/website-plan/types";
import type { AiWebsitePlan } from "@/lib/website/ai/types";

export class DeterministicWebsitePlanProvider
  implements AiWebsitePlanProvider
{
  readonly id = "deterministic" as const;

  plan(input: AiWebsitePlanInput): AiWebsitePlan {
    return inferWebsitePlan(input);
  }
}

const providers = new Map<string, AiWebsitePlanProvider>();

function ensureDefaultsRegistered(): void {
  if (!providers.has("deterministic")) {
    providers.set("deterministic", new DeterministicWebsitePlanProvider());
  }
}

/** Register a website-plan provider (e.g. future LLM adapter). Replaces same id. */
export function registerWebsitePlanProvider(
  provider: AiWebsitePlanProvider,
): void {
  ensureDefaultsRegistered();
  providers.set(provider.id, provider);
}

export function getWebsitePlanProvider(
  id: AiWebsitePlanProviderId = "deterministic",
): AiWebsitePlanProvider {
  ensureDefaultsRegistered();
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown website plan provider: ${id}`);
  }
  return provider;
}

export function listWebsitePlanProviders(): AiWebsitePlanProviderId[] {
  ensureDefaultsRegistered();
  return [...providers.keys()];
}

/**
 * Plan via the selected provider (default: deterministic).
 * Async-capable so future LLM providers fit the same call site.
 */
export async function deriveWebsitePlan(
  input: AiWebsitePlanInput,
  providerId: AiWebsitePlanProviderId = "deterministic",
): Promise<AiWebsitePlanResult> {
  const provider = getWebsitePlanProvider(providerId);
  const plan = await Promise.resolve(provider.plan(input));
  return { plan, providerId: provider.id };
}

/** Sync path for the deterministic engine only. */
export function deriveWebsitePlanSync(
  input: AiWebsitePlanInput,
): AiWebsitePlan {
  return getWebsitePlanProvider("deterministic").plan(input) as AiWebsitePlan;
}
