import os
from functools import lru_cache
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv
from ibm_watsonx_ai import Credentials, APIClient
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
from ibm_watsonx_ai.foundation_models.utils.enums import DecodingMethods

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


class WatsonxService:
    def __init__(self) -> None:
        self.url = os.getenv("WATSONX_URL", "").strip()
        self.api_key = os.getenv("WATSONX_APIKEY", "").strip()
        self.project_id = os.getenv("WATSONX_PROJECT_ID", "").strip()
        self.model_id = os.getenv(
            "WATSONX_MODEL_ID",
            "mistralai/mistral-small-3-1-24b-instruct-2503",
        ).strip()

        if not self.url or not self.api_key or not self.project_id:
            raise ValueError(
                "Missing one or more required env vars: "
                "WATSONX_URL, WATSONX_APIKEY, WATSONX_PROJECT_ID"
            )

        self.credentials = Credentials(
            url=self.url,
            api_key=self.api_key,
        )
        self.client = APIClient(
            credentials=self.credentials,
            project_id=self.project_id,
        )

    def _model(self) -> ModelInference:
        params = {
            GenParams.DECODING_METHOD: DecodingMethods.GREEDY,
            GenParams.MAX_NEW_TOKENS: 220,
        }

        return ModelInference(
            model_id=self.model_id,
            api_client=self.client,
            project_id=self.project_id,
            params=params,
        )

    def generate_handoff_draft(
        self,
        *,
        pregnancy_status: str,
        postpartum_hours: Optional[int],
        danger_signs: list[str],
        transport_mode: str,
        blood_pressure: str,
        heart_rate: int,
        interventions_given: list[str],
        clinician_note: str,
    ) -> str:
        prompt = f"""
You are drafting a concise maternal referral handoff summary for clinician review.

This is clinical support only.
Do not diagnose.
Do not recommend treatment planning.
Do not present autonomous triage decisions.
Base the draft only on the information provided.

Patient context:
- Pregnancy status: {pregnancy_status}
- Postpartum hours: {postpartum_hours}
- Danger signs: {", ".join(danger_signs) if danger_signs else "None provided"}
- Transport mode: {transport_mode}
- Blood pressure: {blood_pressure}
- Heart rate: {heart_rate}
- Interventions already given: {", ".join(interventions_given) if interventions_given else "None documented"}
- Clinician note: {clinician_note}

Write the output in plain text only.
Do not use markdown.
Do not use asterisks.
Do not use bullet symbols.
Use exactly these section labels:

Referral Summary:
Current Concerns Observed:
Interventions Already Documented:
Information to Verify Before Transfer:

Keep the wording concise, factual, and reviewable.
"""
        response = self._model().generate_text(prompt=prompt).strip()
        return response.replace("\\n", "\n")


def build_local_handoff_draft(
    *,
    pregnancy_status: str,
    postpartum_hours: Optional[int],
    danger_signs: list[str],
    transport_mode: str,
    blood_pressure: str,
    heart_rate: int,
    interventions_given: list[str],
    clinician_note: str,
) -> str:
    concern_bits: list[str] = []

    if pregnancy_status:
        concern_bits.append(pregnancy_status.capitalize())
    if postpartum_hours is not None:
        concern_bits.append(f"{postpartum_hours} hours postpartum")
    if danger_signs:
        concern_bits.append(", ".join(danger_signs))
    if blood_pressure:
        concern_bits.append(f"blood pressure {blood_pressure}")
    if heart_rate:
        concern_bits.append(f"heart rate {heart_rate}")
    if transport_mode:
        concern_bits.append(f"transport by {transport_mode}")

    summary = (
        ". ".join(concern_bits) + "."
        if concern_bits
        else "Urgent maternal referral case based on entered information."
    )

    interventions_text = (
        ", ".join(interventions_given) if interventions_given else "None documented."
    )
    concerns_text = ", ".join(danger_signs) if danger_signs else "None documented."

    verification_items = []
    if clinician_note:
        verification_items.append(clinician_note)
    verification_items.append("Confirm receiving facility availability before transfer.")
    verification_items.append("Final referral decisions remain with the clinician.")

    return "\n".join(
        [
            "Referral Summary:",
            summary,
            "",
            "Current Concerns Observed:",
            concerns_text,
            "",
            "Interventions Already Documented:",
            interventions_text,
            "",
            "Information to Verify Before Transfer:",
            " ".join(verification_items),
        ]
    )


@lru_cache
def get_watsonx_service() -> WatsonxService:
    return WatsonxService()
