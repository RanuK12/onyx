"""The backend owns the single source of truth for Craft-supported providers
(``BUILD_MODE_PROVIDERS`` in ``configs.py``), served to the frontend via
``GET /build/recommended-models``. These tests guard that every supported
provider type has a recommended default in the bundled recommended-models
config, since the picker derives its model list and default from there."""

from __future__ import annotations

import pytest

from onyx.llm.well_known_providers.auto_update_models import LLMRecommendations
from onyx.llm.well_known_providers.llm_provider_options import (
    _load_bundled_recommendations,
)
from onyx.server.features.build.configs import BUILD_MODE_ALLOWED_PROVIDER_TYPES
from onyx.server.features.build.configs import BUILD_MODE_PROVIDERS
from onyx.server.features.build.recommended_models import (
    get_build_recommended_providers,
)
from onyx.server.features.build.recommended_models import visible_models


def test_allowed_types_derive_from_providers() -> None:
    assert BUILD_MODE_ALLOWED_PROVIDER_TYPES == [
        p.provider for p in BUILD_MODE_PROVIDERS
    ]


def test_recommended_config_covers_allowed_provider_types() -> None:
    recommendations = _load_bundled_recommendations()
    for provider_type in BUILD_MODE_ALLOWED_PROVIDER_TYPES:
        assert recommendations.get_default_model(provider_type) is not None, (
            f"recommended-models.json has no default_model for Craft provider "
            f"type {provider_type!r}"
        )


def test_visible_models_no_duplicates_in_bundled_config() -> None:
    recommendations = _load_bundled_recommendations()
    for provider_type in BUILD_MODE_ALLOWED_PROVIDER_TYPES:
        names = [m.name for m in visible_models(provider_type, recommendations)]
        assert len(names) == len(set(names)), f"duplicate models for {provider_type!r}"


def test_visible_models_dedupes_default_and_prefers_display_name() -> None:
    # default is a bare string; the same model is repeated in additional_visible_models
    # with a display name. The deduped result must be a single entry carrying it.
    recommendations = LLMRecommendations.model_validate(
        {
            "version": "test",
            "updated_at": "2026-01-01T00:00:00Z",
            "providers": {
                "anthropic": {
                    "default_model": "claude-opus-4-8",
                    "additional_visible_models": [
                        {"name": "claude-opus-4-8", "display_name": "Claude Opus 4.8"},
                        {
                            "name": "claude-sonnet-4-6",
                            "display_name": "Claude Sonnet 4.6",
                        },
                    ],
                }
            },
        }
    )
    models = visible_models("anthropic", recommendations)
    assert [(m.name, m.display_name) for m in models] == [
        ("claude-opus-4-8", "Claude Opus 4.8"),
        ("claude-sonnet-4-6", "Claude Sonnet 4.6"),
    ]


def test_get_build_recommended_providers_shape(monkeypatch: pytest.MonkeyPatch) -> None:
    recommendations = LLMRecommendations.model_validate(
        {
            "version": "test",
            "updated_at": "2026-01-01T00:00:00Z",
            "providers": {
                "anthropic": {"default_model": "claude-opus-4-8"},
                "openai": {"default_model": "gpt-5.5"},
                # openrouter intentionally omitted to exercise the empty/None path
            },
        }
    )
    monkeypatch.setattr(
        "onyx.server.features.build.recommended_models.get_recommendations",
        lambda: recommendations,
    )

    providers = get_build_recommended_providers()

    assert [p.provider for p in providers] == BUILD_MODE_ALLOWED_PROVIDER_TYPES
    by_type = {p.provider: p for p in providers}
    assert by_type["anthropic"].recommended is True
    assert by_type["anthropic"].recommended_default_model == "claude-opus-4-8"
    assert by_type["anthropic"].api_key_placeholder == "sk-ant-..."
    # A provider missing from the config still appears, with no recommended model.
    assert by_type["openrouter"].recommended_default_model is None
    assert by_type["openrouter"].models == []
