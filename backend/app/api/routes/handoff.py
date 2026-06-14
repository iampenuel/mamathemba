import logging

from fastapi import APIRouter, HTTPException

from app.schemas.handoff import HandoffDraftRequest
from app.services.watsonx_service import (
    build_local_handoff_draft,
    get_watsonx_service,
)

router = APIRouter(prefix="/api/handoff", tags=["handoff"])
logger = logging.getLogger(__name__)

GENERIC_HANDOFF_ERROR = "Could not generate handoff draft."
EXPECTED_HANDOFF_FALLBACK_ERRORS: tuple[type[Exception], ...] = (
    RuntimeError,
    OSError,
    ValueError,
    TypeError,
    KeyError,
    AttributeError,
    ImportError,
)


def _handoff_kwargs(payload: HandoffDraftRequest):
    return {
        "pregnancy_status": payload.pregnancy_status,
        "postpartum_hours": payload.postpartum_hours,
        "danger_signs": payload.danger_signs,
        "transport_mode": payload.transport_mode,
        "blood_pressure": payload.blood_pressure,
        "heart_rate": payload.heart_rate,
        "interventions_given": payload.interventions_given,
        "clinician_note": payload.clinician_note,
    }


def _generate_reviewable_draft(payload: HandoffDraftRequest) -> str:
    try:
        service = get_watsonx_service()
        return service.generate_handoff_draft(**_handoff_kwargs(payload))
    except EXPECTED_HANDOFF_FALLBACK_ERRORS as exc:
        logger.exception(
            "watsonx handoff generation failed on /api/handoff/draft (%s); using local fallback",
            exc.__class__.__name__,
        )
        return build_local_handoff_draft(**_handoff_kwargs(payload))


@router.post("/draft")
def generate_handoff_draft(payload: HandoffDraftRequest):
    try:
        return {"draft": _generate_reviewable_draft(payload)}
    except Exception as exc:
        logger.exception("Handoff draft generation failed")
        raise HTTPException(status_code=500, detail=GENERIC_HANDOFF_ERROR) from exc
