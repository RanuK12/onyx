"""Builds the Craft recommended-providers payload (chrome + recommended models)
from the shared recommended-models config. Kept dependency-light so it can be
imported without the FastAPI router."""

from onyx.llm.well_known_providers.auto_update_models import LLMRecommendations
from onyx.llm.well_known_providers.llm_provider_options import get_recommendations
from onyx.server.features.build.api.models import BuildRecommendedModel
from onyx.server.features.build.api.models import BuildRecommendedProvider
from onyx.server.features.build.configs import BUILD_MODE_PROVIDERS


def visible_models(
    provider_type: str, recs: LLMRecommendations
) -> list[BuildRecommendedModel]:
    # get_visible_models() repeats the default in additional; dedupe by name,
    # preferring the entry that carries a real display name.
    by_name: dict[str, str] = {}
    for m in recs.get_visible_models(provider_type):
        if m.name not in by_name or (m.display_name and by_name[m.name] == m.name):
            by_name[m.name] = m.display_name or m.name
    return [BuildRecommendedModel(name=n, display_name=d) for n, d in by_name.items()]


def get_build_recommended_providers() -> list[BuildRecommendedProvider]:
    recs = get_recommendations()
    return [
        BuildRecommendedProvider(
            **p.model_dump(),
            recommended_default_model=(
                default.name
                if (default := recs.get_default_model(p.provider))
                else None
            ),
            models=visible_models(p.provider, recs),
        )
        for p in BUILD_MODE_PROVIDERS
    ]
