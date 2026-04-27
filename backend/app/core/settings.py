from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "mamathemba-backend")
    app_version: str = os.getenv("APP_VERSION", "0.1.0")

    watsonx_api_key: str = os.getenv("WATSONX_API_KEY", "")
    watsonx_project_id: str = os.getenv("WATSONX_PROJECT_ID", "")
    watsonx_url: str = os.getenv("WATSONX_URL", "")
    watsonx_model_id: str = os.getenv(
        "WATSONX_MODEL_ID",
        "ibm/granite-3-8b-instruct",
    )

    orchestrate_api_key: str = os.getenv("ORCHESTRATE_API_KEY", "")
    orchestrate_url: str = os.getenv("ORCHESTRATE_URL", "")

    @property
    def watsonx_configured(self) -> bool:
        return bool(
            self.watsonx_api_key and self.watsonx_project_id and self.watsonx_url
        )


settings = Settings()
