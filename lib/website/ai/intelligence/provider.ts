/**
 * Business Intelligence providers (Sprint C2).
 * Deterministic provider ships now; registry supports future AI adapters.
 */

import { inferBusinessProfile } from "@/lib/website/ai/intelligence/engine";
import type {
  AiBusinessIntelligenceInput,
  AiBusinessIntelligenceProvider,
  AiBusinessIntelligenceProviderId,
  AiBusinessIntelligenceResult,
} from "@/lib/website/ai/intelligence/types";
import type { AiBusinessProfile } from "@/lib/website/ai/types";

export class DeterministicBusinessIntelligenceProvider
  implements AiBusinessIntelligenceProvider
{
  readonly id = "deterministic" as const;

  analyze(input: AiBusinessIntelligenceInput): AiBusinessProfile {
    return inferBusinessProfile(input);
  }
}

const providers = new Map<string, AiBusinessIntelligenceProvider>();

function ensureDefaultsRegistered(): void {
  if (!providers.has("deterministic")) {
    providers.set(
      "deterministic",
      new DeterministicBusinessIntelligenceProvider(),
    );
  }
}

/** Register a BI provider (e.g. future LLM adapter). Replaces same id. */
export function registerBusinessIntelligenceProvider(
  provider: AiBusinessIntelligenceProvider,
): void {
  ensureDefaultsRegistered();
  providers.set(provider.id, provider);
}

export function getBusinessIntelligenceProvider(
  id: AiBusinessIntelligenceProviderId = "deterministic",
): AiBusinessIntelligenceProvider {
  ensureDefaultsRegistered();
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown business intelligence provider: ${id}`);
  }
  return provider;
}

export function listBusinessIntelligenceProviders(): AiBusinessIntelligenceProviderId[] {
  ensureDefaultsRegistered();
  return [...providers.keys()];
}

/**
 * Analyze a prompt via the selected provider (default: deterministic).
 * Async-capable so future LLM providers fit the same call site.
 */
export async function analyzeBusinessPrompt(
  input: AiBusinessIntelligenceInput,
  providerId: AiBusinessIntelligenceProviderId = "deterministic",
): Promise<AiBusinessIntelligenceResult> {
  const provider = getBusinessIntelligenceProvider(providerId);
  const profile = await Promise.resolve(provider.analyze(input));
  return { profile, providerId: provider.id };
}

/** Sync path for the deterministic engine only. */
export function analyzeBusinessPromptSync(
  input: AiBusinessIntelligenceInput,
): AiBusinessProfile {
  return getBusinessIntelligenceProvider("deterministic").analyze(
    input,
  ) as AiBusinessProfile;
}
