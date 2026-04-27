import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.facility_matcher import rank_facilities
from app.services.routing_service import resolve_origin
from app.services.watsonx_service import (
    build_local_handoff_draft,
    get_watsonx_service,
)

router = APIRouter(prefix="/api/cases", tags=["cases"])
logger = logging.getLogger(__name__)


class CaseIntakeRequest(BaseModel):
    patient_id: str
    age_years: int | None = None
    pregnancy_status: str
    gestational_weeks: int | None = None
    postpartum_hours: int | None = None
    danger_signs: list[str] | str = []
    transport_mode: str
    interventions_given: list[str] | str = []
    systolic_bp: int | str | None = None
    diastolic_bp: int | str | None = None
    heart_rate: int | None = None
    clinician_notes: str = ""
    origin_label: str | None = None
    origin_address: str | None = None
    origin_lat: float | None = None
    origin_lng: float | None = None
    origin_source: str | None = None
    origin_country_code: str | None = None
    origin_country: str | None = None
    origin_admin1: str | None = None
    origin_admin2: str | None = None


def _to_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        return [v.strip() for v in value.split(",") if v.strip()]
    return []


@router.get("/")
def list_cases():
    return {"message": "cases route works"}


@router.post("/intake")
def intake_case(payload: CaseIntakeRequest):
    try:
        danger_signs = _to_list(payload.danger_signs)
        interventions_given = _to_list(payload.interventions_given)

        blood_pressure = ""
        if payload.systolic_bp is not None and payload.diastolic_bp is not None:
            blood_pressure = f"{payload.systolic_bp}/{payload.diastolic_bp}"

        try:
            service = get_watsonx_service()
            draft = service.generate_handoff_draft(
                pregnancy_status=payload.pregnancy_status,
                postpartum_hours=payload.postpartum_hours,
                danger_signs=danger_signs,
                transport_mode=payload.transport_mode,
                blood_pressure=blood_pressure,
                heart_rate=payload.heart_rate or 0,
                interventions_given=interventions_given,
                clinician_note=payload.clinician_notes,
            )
        except Exception:
            logger.exception(
                "watsonx handoff generation failed for case %s; using local fallback",
                payload.patient_id,
            )
            draft = build_local_handoff_draft(
                pregnancy_status=payload.pregnancy_status,
                postpartum_hours=payload.postpartum_hours,
                danger_signs=danger_signs,
                transport_mode=payload.transport_mode,
                blood_pressure=blood_pressure,
                heart_rate=payload.heart_rate or 0,
                interventions_given=interventions_given,
                clinician_note=payload.clinician_notes,
            )

        referral_summary_parts = []
        if payload.pregnancy_status:
            referral_summary_parts.append(payload.pregnancy_status)
        if danger_signs:
            referral_summary_parts.append(", ".join(danger_signs))
        if blood_pressure:
            referral_summary_parts.append(f"BP {blood_pressure}")
        if payload.heart_rate:
            referral_summary_parts.append(f"HR {payload.heart_rate}")

        referral_summary = "Urgent maternal referral case."
        if referral_summary_parts:
            referral_summary = (
                "Urgent maternal referral case: "
                + " | ".join(referral_summary_parts)
            )

        missing_information: list[str] = []
        if not payload.transport_mode:
            missing_information.append("Transport mode not documented.")
        if not payload.clinician_notes:
            missing_information.append("Clinician note not documented.")
        if (
            payload.pregnancy_status.lower() == "postpartum"
            and payload.postpartum_hours is None
        ):
            missing_information.append("Postpartum hours not documented.")
        if (
            payload.pregnancy_status.lower() != "postpartum"
            and payload.gestational_weeks is None
        ):
            missing_information.append("Gestational weeks not documented.")

        # Keep facility matching optional so it never breaks intake.
        facility_options = []
        try:
            origin_payload = {
                "danger_signs": danger_signs,
                "pregnancy_status": payload.pregnancy_status,
                "transport_mode": payload.transport_mode,
                "origin_label": payload.origin_label,
                "origin_address": payload.origin_address,
                "origin_lat": payload.origin_lat,
                "origin_lng": payload.origin_lng,
                "origin_source": payload.origin_source,
                "origin_country_code": payload.origin_country_code,
                "origin_country": payload.origin_country,
                "origin_admin1": payload.origin_admin1,
                "origin_admin2": payload.origin_admin2,
            }
            resolved_origin = resolve_origin(origin_payload)
            ranked_facilities = rank_facilities(
                origin_payload,
                resolved_origin=resolved_origin,
            )

            origin_warning = next(
                (
                    facility.get("origin_warning")
                    for facility in ranked_facilities
                    if facility.get("origin_warning")
                ),
                None,
            )
            if origin_warning and origin_warning not in missing_information:
                missing_information.append(str(origin_warning))
            if not ranked_facilities:
                resolved_origin_warning = resolved_origin.get("warning")
                if resolved_origin_warning:
                    warning_text = str(resolved_origin_warning)
                    if warning_text not in missing_information:
                        missing_information.append(warning_text)
                elif resolved_origin.get("status") == "resolved":
                    warning_text = (
                        "No facility options are available for the entered region "
                        "in the current facility registry."
                    )
                    if warning_text not in missing_information:
                        missing_information.append(warning_text)

            facility_options = ranked_facilities[:3]
        except Exception:
            logger.exception(
                "Facility matching failed during intake for case %s",
                payload.patient_id,
            )
            facility_options = []

        return {
            "case_id": payload.patient_id,
            "referral_readiness_summary": referral_summary,
            "missing_information": missing_information,
            "facility_options": facility_options,
            "draft_handoff_note": draft,
            "next_steps": [
                "Confirm receiving facility contact and acceptance.",
                "Review missing handoff fields before sending.",
                "Prepare referral documentation and packet for transfer.",
                "Confirm transport arrangement and escalation timing.",
                "Review case with supervising clinician if required.",
                "Confirm interventions already recorded in the packet.",
            ],
        }
    except Exception as exc:
        logger.exception("Case intake failed for case %s", payload.patient_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
