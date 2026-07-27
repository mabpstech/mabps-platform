/**
 * Website Composer providers (Sprint C6).
 * Deterministic provider ships now; registry supports future AI adapters.
 */

import { composeWebsiteBlueprint } from "@/lib/website/ai/website-composer/engine";
import type {
  AiWebsiteComposerInput,
  AiWebsiteComposerProvider,
  AiWebsiteComposerProviderId,
  AiWebsiteComposerResult,
} from "@/lib/website/ai/website-composer/types";
import type { AiWebsiteBlueprint } from "@/lib/website/ai/types";

export class DeterministicWebsiteComposerProvider
  implements AiWebsiteComposerProvider
{
  readonly id = "deterministic" as const;

  compose(input: AiWebsiteComposerInput): AiWebsiteBlueprint {
    return composeWebsiteBlueprint(input);
  }
}

const providers = new Map<string, AiWebsiteComposerProvider>();

function ensureDefaultsRegistered(): void {
  if (!providers.has("deterministic")) {
    providers.set("deterministic", new DeterministicWebsiteComposerProvider());
  }
}

/** Register a website-composer provider (e.g. future LLM adapter). Replaces same id. */
export function registerWebsiteComposerProvider(
  provider: AiWebsiteComposerProvider,
): void {
  ensureDefaultsRegistered();
  providers.set(provider.id, provider);
}

export function getWebsiteComposerProvider(
  id: AiWebsiteComposerProviderId = "deterministic",
): AiWebsiteComposerProvider {
  ensureDefaultsRegistered();
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown website composer provider: ${id}`);
  }
  return provider;
}

export function listWebsiteComposerProviders(): AiWebsiteComposerProviderId[] {
  ensureDefaultsRegistered();
  return [...providers.keys()];
}

/**
 * Compose via the selected provider (default: deterministic).
 * Async-capable so future LLM providers fit the same call site.
 */
export async function composeWebsite(
  input: AiWebsiteComposerInput,
  providerId: AiWebsiteComposerProviderId = "deterministic",
): Promise<AiWebsiteComposerResult> {
  const provider = getWebsiteComposerProvider(providerId);
  const blueprint = await Promise.resolve(provider.compose(input));
  return { blueprint, providerId: provider.id };
}

/** Sync path for the deterministic engine only. */
export function composeWebsiteSync(
  input: AiWebsiteComposerInput,
): AiWebsiteBlueprint {
  return getWebsiteComposerProvider("deterministic").compose(
    input,
  ) as AiWebsiteBlueprint;
}
