/**
 * Brand Strategy providers (Sprint C4).
 * Deterministic provider ships now; registry supports future AI adapters.
 */

import { inferBrandStrategy } from "@/lib/website/ai/brand-strategy/engine";
import type {
  AiBrandStrategyInput,
  AiBrandStrategyProvider,
  AiBrandStrategyProviderId,
  AiBrandStrategyResult,
} from "@/lib/website/ai/brand-strategy/types";
import type { AiBrandStrategy } from "@/lib/website/ai/types";

export class DeterministicBrandStrategyProvider
  implements AiBrandStrategyProvider
{
  readonly id = "deterministic" as const;

  derive(input: AiBrandStrategyInput): AiBrandStrategy {
    return inferBrandStrategy(input);
  }
}

const providers = new Map<string, AiBrandStrategyProvider>();

function ensureDefaultsRegistered(): void {
  if (!providers.has("deterministic")) {
    providers.set("deterministic", new DeterministicBrandStrategyProvider());
  }
}

/** Register a brand-strategy provider (e.g. future LLM adapter). Replaces same id. */
export function registerBrandStrategyProvider(
  provider: AiBrandStrategyProvider,
): void {
  ensureDefaultsRegistered();
  providers.set(provider.id, provider);
}

export function getBrandStrategyProvider(
  id: AiBrandStrategyProviderId = "deterministic",
): AiBrandStrategyProvider {
  ensureDefaultsRegistered();
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown brand strategy provider: ${id}`);
  }
  return provider;
}

export function listBrandStrategyProviders(): AiBrandStrategyProviderId[] {
  ensureDefaultsRegistered();
  return [...providers.keys()];
}

/**
 * Derive strategy via the selected provider (default: deterministic).
 * Async-capable so future LLM providers fit the same call site.
 */
export async function deriveBrandStrategy(
  input: AiBrandStrategyInput,
  providerId: AiBrandStrategyProviderId = "deterministic",
): Promise<AiBrandStrategyResult> {
  const provider = getBrandStrategyProvider(providerId);
  const strategy = await Promise.resolve(provider.derive(input));
  return { strategy, providerId: provider.id };
}

/** Sync path for the deterministic engine only. */
export function deriveBrandStrategySync(
  input: AiBrandStrategyInput,
): AiBrandStrategy {
  return getBrandStrategyProvider("deterministic").derive(
    input,
  ) as AiBrandStrategy;
}
