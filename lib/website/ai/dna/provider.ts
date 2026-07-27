/**
 * Business DNA providers (Sprint C3).
 * Deterministic provider ships now; registry supports future AI adapters.
 */

import { inferBusinessDna } from "@/lib/website/ai/dna/engine";
import type {
  AiBusinessDnaInput,
  AiBusinessDnaProvider,
  AiBusinessDnaProviderId,
  AiBusinessDnaResult,
} from "@/lib/website/ai/dna/types";
import type { AiBusinessDNA } from "@/lib/website/ai/types";

export class DeterministicBusinessDnaProvider
  implements AiBusinessDnaProvider
{
  readonly id = "deterministic" as const;

  derive(input: AiBusinessDnaInput): AiBusinessDNA {
    return inferBusinessDna(input);
  }
}

const providers = new Map<string, AiBusinessDnaProvider>();

function ensureDefaultsRegistered(): void {
  if (!providers.has("deterministic")) {
    providers.set("deterministic", new DeterministicBusinessDnaProvider());
  }
}

/** Register a DNA provider (e.g. future LLM adapter). Replaces same id. */
export function registerBusinessDnaProvider(
  provider: AiBusinessDnaProvider,
): void {
  ensureDefaultsRegistered();
  providers.set(provider.id, provider);
}

export function getBusinessDnaProvider(
  id: AiBusinessDnaProviderId = "deterministic",
): AiBusinessDnaProvider {
  ensureDefaultsRegistered();
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown business DNA provider: ${id}`);
  }
  return provider;
}

export function listBusinessDnaProviders(): AiBusinessDnaProviderId[] {
  ensureDefaultsRegistered();
  return [...providers.keys()];
}

/**
 * Derive DNA via the selected provider (default: deterministic).
 * Async-capable so future LLM providers fit the same call site.
 */
export async function deriveBusinessDna(
  input: AiBusinessDnaInput,
  providerId: AiBusinessDnaProviderId = "deterministic",
): Promise<AiBusinessDnaResult> {
  const provider = getBusinessDnaProvider(providerId);
  const dna = await Promise.resolve(provider.derive(input));
  return { dna, providerId: provider.id };
}

/** Sync path for the deterministic engine only. */
export function deriveBusinessDnaSync(input: AiBusinessDnaInput): AiBusinessDNA {
  return getBusinessDnaProvider("deterministic").derive(input) as AiBusinessDNA;
}
