import logging

from fastapi import APIRouter, HTTPException

from app.schemas.handoff import HandoffDraftRequest
from app.services.watsonx_service import (
    build_local_handoff_draft,
    get_watsonx_service,
)

router = APIRouter(prefix="/api/handoff", tags=["handoff"])
logger = logging.getLogger(__name__)

@router.post("/draft")
def generate_handoff_draft(payload: HandoffDraftRequest):
    try:
        try:
            service = get_watsonx_service()
            draft = service.generate_handoff_draft(
                pregnancy_status=payload.pregnancy_status,
                postpartum_hours=payload.postpartum_hours,
                danger_signs=payload.danger_signs,
                transport_mode=payload.transport_mode,
                blood_pressure=payload.blood_pressure,
                heart_rate=payload.heart_rate,
                interventions_given=payload.interventions_given,
                clinician_note=payload.clinician_note,
            )
        except Exception:
            logger.exception(
                "watsonx handoff generation failed on /api/handoff/draft; using local fallback"
            )
            draft = build_local_handoff_draft(
                pregnancy_status=payload.pregnancy_status,
                postpartum_hours=payload.postpartum_hours,
                danger_signs=payload.danger_signs,
                transport_mode=payload.transport_mode,
                blood_pressure=payload.blood_pressure,
                heart_rate=payload.heart_rate,
                interventions_given=payload.interventions_given,
                clinician_note=payload.clinician_note,
            )
        return {"draft": draft}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
