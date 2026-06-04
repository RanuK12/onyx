import {
  BuildRecommendedProvider,
  getDefaultLlmSelection,
  getDefaultModelForType,
  getTopRecommendedModelLabel,
  hasSupportedCraftProvider,
  isRecommendedModelName,
} from "@/app/craft/onboarding/constants";

function provider(
  overrides: Partial<BuildRecommendedProvider> & { provider: string }
): BuildRecommendedProvider {
  return {
    label: overrides.provider,
    recommended: false,
    api_key_placeholder: "",
    recommended_default_model: null,
    models: [],
    ...overrides,
  };
}

const RECS: BuildRecommendedProvider[] = [
  provider({
    provider: "anthropic",
    label: "Anthropic",
    recommended: true,
    recommended_default_model: "claude-opus-4-8",
    models: [
      { name: "claude-opus-4-8", display_name: "Claude Opus 4.8" },
      { name: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6" },
    ],
  }),
  provider({
    provider: "openai",
    label: "OpenAI",
    recommended_default_model: "gpt-5.5",
    models: [{ name: "gpt-5.5", display_name: "gpt-5.5" }],
  }),
];

describe("hasSupportedCraftProvider", () => {
  it("is false while recommendations are undefined (loading/error)", () => {
    expect(
      hasSupportedCraftProvider([{ provider: "anthropic" }], undefined)
    ).toBe(false);
  });

  it("is true when a configured provider matches a recommended type", () => {
    expect(hasSupportedCraftProvider([{ provider: "anthropic" }], RECS)).toBe(
      true
    );
  });

  it("is false when no configured provider is a supported type", () => {
    expect(hasSupportedCraftProvider([{ provider: "azure" }], RECS)).toBe(
      false
    );
  });
});

describe("getDefaultModelForType", () => {
  it("returns the recommended default", () => {
    expect(getDefaultModelForType(RECS, "anthropic")).toBe("claude-opus-4-8");
  });

  it("falls back to the first model when no default", () => {
    const recs = [
      provider({
        provider: "openrouter",
        recommended_default_model: null,
        models: [{ name: "z-ai/glm-5.1", display_name: "GLM 5.1" }],
      }),
    ];
    expect(getDefaultModelForType(recs, "openrouter")).toBe("z-ai/glm-5.1");
  });

  it("returns null for unknown type or undefined recs", () => {
    expect(getDefaultModelForType(RECS, "azure")).toBeNull();
    expect(getDefaultModelForType(undefined, "anthropic")).toBeNull();
  });
});

describe("getDefaultLlmSelection", () => {
  it("picks the highest-priority configured provider with its default model", () => {
    const result = getDefaultLlmSelection(RECS, [
      { name: "OpenAI", provider: "openai" },
      { name: "Anthropic", provider: "anthropic" },
    ]);
    expect(result).toEqual({
      providerName: "Anthropic",
      provider: "anthropic",
      modelName: "claude-opus-4-8",
    });
  });

  it("returns null when no providers are configured", () => {
    expect(getDefaultLlmSelection(RECS, [])).toBeNull();
    expect(getDefaultLlmSelection(RECS, undefined)).toBeNull();
  });

  it("returns null while recommendations have not loaded", () => {
    expect(
      getDefaultLlmSelection(undefined, [{ name: "a", provider: "anthropic" }])
    ).toBeNull();
  });
});

describe("isRecommendedModelName", () => {
  it("matches only the recommended default model", () => {
    expect(isRecommendedModelName(RECS, "claude-opus-4-8")).toBe(true);
    expect(isRecommendedModelName(RECS, "claude-sonnet-4-6")).toBe(false);
    expect(isRecommendedModelName(undefined, "claude-opus-4-8")).toBe(false);
  });
});

describe("getTopRecommendedModelLabel", () => {
  it("returns the recommended provider's default display name", () => {
    expect(getTopRecommendedModelLabel(RECS)).toBe("Claude Opus 4.8");
  });

  it("falls back to a generic phrase before load", () => {
    expect(getTopRecommendedModelLabel(undefined)).toBe(
      "the recommended model"
    );
  });
});
