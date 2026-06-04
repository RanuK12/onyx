// =============================================================================
// LLM Selection Types and Utilities
// =============================================================================

export interface BuildLlmSelection {
  providerName: string; // LLMProviderDescriptor.name (any configured provider)
  provider: string; // e.g., "anthropic"
  modelName: string; // e.g., "claude-opus-4-7"
}

export type ProviderKey = "anthropic" | "openai" | "openrouter";

// `/api/build/recommended-models` response shape (backend-owned source of truth).
export interface BuildRecommendedModel {
  name: string;
  display_name: string;
}

export interface BuildRecommendedProvider {
  provider: string;
  label: string;
  recommended: boolean;
  api_key_placeholder: string;
  recommended_default_model: string | null;
  models: BuildRecommendedModel[];
}

interface MinimalLlmProvider {
  name: string | null;
  provider: string;
}

export function isSupportedProviderType(
  provider: string,
  recommendedProviders: BuildRecommendedProvider[] | undefined
): boolean {
  return !!recommendedProviders?.some((p) => p.provider === provider);
}

// At least one configured provider is a supported Craft type. `false` until
// recommendations have loaded.
export function hasSupportedCraftProvider(
  llmProviders: { provider: string }[] | undefined,
  recommendedProviders: BuildRecommendedProvider[] | undefined
): boolean {
  return !!llmProviders?.some((p) =>
    isSupportedProviderType(p.provider, recommendedProviders)
  );
}

export function isRecommendedModelName(
  recommendedProviders: BuildRecommendedProvider[] | undefined,
  modelName: string
): boolean {
  return !!recommendedProviders?.some(
    (p) => p.recommended_default_model === modelName
  );
}

export function getDefaultModelForType(
  recommendedProviders: BuildRecommendedProvider[] | undefined,
  key: string
): string | null {
  const p = recommendedProviders?.find((x) => x.provider === key);
  if (!p) return null;
  return p.recommended_default_model ?? p.models[0]?.name ?? null;
}

// Highest-priority configured provider of a supported type, with that type's
// recommended model. Access control is enforced server-side at session create.
export function getDefaultLlmSelection(
  recommendedProviders: BuildRecommendedProvider[] | undefined,
  llmProviders: MinimalLlmProvider[] | undefined
): BuildLlmSelection | null {
  if (!llmProviders || llmProviders.length === 0) return null;

  for (const rp of recommendedProviders ?? []) {
    const match = llmProviders.find((lp) => lp.provider === rp.provider);
    if (match) {
      const modelName = getDefaultModelForType(
        recommendedProviders,
        rp.provider
      );
      if (!modelName) continue;
      return {
        providerName: match.name ?? "",
        provider: match.provider,
        modelName,
      };
    }
  }

  return null;
}

// Display label of the top recommended model (generic phrase until loaded).
export function getTopRecommendedModelLabel(
  recommendedProviders: BuildRecommendedProvider[] | undefined
): string {
  const rp =
    recommendedProviders?.find((p) => p.recommended) ??
    recommendedProviders?.[0];
  const defaultName = rp?.recommended_default_model;
  if (!defaultName) return "the recommended model";
  return (
    rp?.models.find((m) => m.name === defaultName)?.display_name ?? defaultName
  );
}

// =============================================================================
// Onboarding "seen" flag
// =============================================================================

// Tracks whether the user has dismissed the craft onboarding modal so the
// intro only auto-shows once.
const CRAFT_ONBOARDING_SEEN_COOKIE_NAME = "craft_onboarding_seen";

export function getCraftOnboardingSeen(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((row) => row.startsWith(`${CRAFT_ONBOARDING_SEEN_COOKIE_NAME}=`));
}

export function setCraftOnboardingSeen(): void {
  if (typeof document === "undefined") return;
  const expires = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000
  ).toUTCString();
  document.cookie = `${CRAFT_ONBOARDING_SEEN_COOKIE_NAME}=1; path=/; expires=${expires}; SameSite=Lax`;
}
