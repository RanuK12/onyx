"use client";

import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/swr-keys";
import { BuildRecommendedProvider } from "@/app/craft/onboarding/constants";

// Recommended models per Craft provider type, from the shared recommended-models config.
export function useCraftRecommendedModels() {
  const { data, error, isLoading } = useSWR<BuildRecommendedProvider[]>(
    SWR_KEYS.buildRecommendedModels,
    errorHandlingFetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 60000,
    }
  );

  return {
    recommendedProviders: data,
    isLoading,
    error,
  };
}
