from __future__ import annotations

from typing import Optional

from app.core.settings import settings

try:
    from ibm_watsonx_ai import APIClient, Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference
except Exception:
    APIClient = None
    Credentials = None
    ModelInference = None


class WatsonxClient:
    """
    Phase 2 live watsonx.ai client.

    Behavior:
    - If IBM credentials are missing, return None and let the app use the local fallback.
    - If IBM is configured, call watsonx.ai for the handoff-note draft.
    """

    def __init__(self) -> None:
        self.settings = settings
        self._client = None
        self._model = None

    def is_configured(self) -> bool:
        return bool(
            self.settings.watsonx_api_key
            and self.settings.watsonx_project_id
            and self.settings.watsonx_url
            and self.settings.watsonx_model_id
            and APIClient is not None
            and Credentials is not None
            and ModelInference is not None
        )

    def _get_model(self):
        if not self.is_configured():
            return None

        if self._model is None:
            credentials = Credentials(
                url=self.settings.watsonx_url,
                api_key=self.settings.watsonx_api_key,
            )

            self._client = APIClient(credentials)

            self._model = ModelInference(
                model_id=self.settings.watsonx_model_id,
                api_client=self._client,
                project_id=self.settings.watsonx_project_id,
            )

        return self._model

    def generate_text(self, prompt: str) -> Optional[str]:
        model = self._get_model()
        if model is None:
            return None

        try:
            result = model.generate_text(prompt=prompt)

            if isinstance(result, str):
                cleaned = result.strip()
                return cleaned or None

            return None
        except Exception as exc:
            print(f"[watsonx] generation failed: {exc}")
            return None