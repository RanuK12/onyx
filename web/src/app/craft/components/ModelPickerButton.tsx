"use client";

import { useMemo } from "react";
import { SelectButton } from "@opal/components";
import { BuildLLMPopover } from "@/app/craft/components/BuildLLMPopover";
import { useOnboarding } from "@/app/craft/onboarding/BuildOnboardingProvider";
import { useLLMProviders } from "@/hooks/useLanguageModels";
import { useCraftRecommendedModels } from "@/hooks/useCraftRecommendedModels";
import { getModelIcon } from "@/lib/languageModels";
import {
  BuildLlmSelection,
  getDefaultLlmSelection,
} from "@/app/craft/onboarding/constants";

interface ModelPickerButtonProps {
  // null → show the recommended default.
  selection: BuildLlmSelection | null;
  onChange: (selection: BuildLlmSelection) => void;
  disabled?: boolean;
}

// Controlled model picker pill matching the main app's ModelSelector.
export default function ModelPickerButton({
  selection,
  onChange,
  disabled = false,
}: ModelPickerButtonProps) {
  const { llmProviders } = useLLMProviders();
  const { recommendedProviders } = useCraftRecommendedModels();
  const { openLlmSetup } = useOnboarding();

  const effective = useMemo(
    () =>
      selection ?? getDefaultLlmSelection(recommendedProviders, llmProviders),
    [selection, recommendedProviders, llmProviders]
  );

  const displayName = useMemo(() => {
    if (!effective) return "Select model";
    if (llmProviders) {
      for (const provider of llmProviders) {
        const config = provider.model_configurations.find(
          (m) => m.name === effective.modelName
        );
        if (config) return config.display_name || config.name;
      }
    }
    for (const provider of recommendedProviders ?? []) {
      const model = provider.models.find((m) => m.name === effective.modelName);
      if (model) return model.display_name;
    }
    return effective.modelName;
  }, [effective, llmProviders, recommendedProviders]);

  const ModelIcon = effective ? getModelIcon(effective.provider) : undefined;

  return (
    <BuildLLMPopover
      currentSelection={effective}
      onSelectionChange={onChange}
      llmProviders={llmProviders}
      onOpenOnboarding={(providerKey) => openLlmSetup(providerKey)}
      disabled={disabled}
    >
      <div className="inline-flex">
        <SelectButton
          icon={ModelIcon}
          state="empty"
          variant="select-input"
          size="lg"
          disabled={disabled}
        >
          {displayName}
        </SelectButton>
      </div>
    </BuildLLMPopover>
  );
}
