/**
 * Creative Director providers (Sprint C7).
 * Deterministic provider ships now; registry supports future AI adapters.
 */

import { inferCreativeDirection } from "@/lib/website/ai/creative-director/engine";
import type {
  AiCreativeDirectorInput,
  AiCreativeDirectorProvider,
  AiCreativeDirectorProviderId,
  AiCreativeDirectorResult,
} from "@/lib/website/ai/creative-director/types";
import type { AiCreativeDirection } from "@/lib/website/ai/types";

export class DeterministicCreativeDirectorProvider
  implements AiCreativeDirectorProvider
{
  readonly id = "deterministic" as const;

  direct(input: AiCreativeDirectorInput): AiCreativeDirection {
    return inferCreativeDirection(input);
  }
}

const providers = new Map<string, AiCreativeDirectorProvider>();

function ensureDefaultsRegistered(): void {
  if (!providers.has("deterministic")) {
    providers.set(
      "deterministic",
      new DeterministicCreativeDirectorProvider(),
    );
  }
}

/** Register a creative-director provider (e.g. future LLM adapter). Replaces same id. */
export function registerCreativeDirectorProvider(
  provider: AiCreativeDirectorProvider,
): void {
  ensureDefaultsRegistered();
  providers.set(provider.id, provider);
}

export function getCreativeDirectorProvider(
  id: AiCreativeDirectorProviderId = "deterministic",
): AiCreativeDirectorProvider {
  ensureDefaultsRegistered();
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown creative director provider: ${id}`);
  }
  return provider;
}

export function listCreativeDirectorProviders(): AiCreativeDirectorProviderId[] {
  ensureDefaultsRegistered();
  return [...providers.keys()];
}

/**
 * Direct via the selected provider (default: deterministic).
 * Async-capable so future LLM providers fit the same call site.
 */
export async function deriveCreativeDirection(
  input: AiCreativeDirectorInput,
  providerId: AiCreativeDirectorProviderId = "deterministic",
): Promise<AiCreativeDirectorResult> {
  const provider = getCreativeDirectorProvider(providerId);
  const direction = await Promise.resolve(provider.direct(input));
  return { direction, providerId: provider.id };
}

/** Sync path for the deterministic engine only. */
export function deriveCreativeDirectionSync(
  input: AiCreativeDirectorInput,
): AiCreativeDirection {
  return getCreativeDirectorProvider("deterministic").direct(
    input,
  ) as AiCreativeDirection;
}
