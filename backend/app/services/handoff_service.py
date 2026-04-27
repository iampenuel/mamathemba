from __future__ import annotations

from backend.app.schemas.cases import CaseIntake, IntakeResponse
from app.services.checklist_service import get_missing_information, get_next_steps
from app.services.facility_matcher import get_ranked_facilities
from app.services.guidance_service import retrieve_guidance_context
from app.services.watsonx_client import WatsonxClient

watsonx_client = WatsonxClient()


def _build_local_summary(case: CaseIntake, missing: list[str]) -> str:
    concern_text = ", ".join(case.danger_signs) if case.danger_signs else "no concern entered"

    if missing:
        status = "Needs clinician review before final escalation."
    else:
        status = "Reviewable for clinician approval."

    return (
        f"Based on entered information, this packet is supporting referral-readiness "
        f"review for: {concern_text}. {status} Human review is required before sending."
    )


def _build_watsonx_prompt(case: CaseIntake, summary: str, guidance_context: str) -> str:
    gestational = (
        str(case.gestational_weeks) if case.gestational_weeks is not None else "not entered"
    )
    postpartum = (
        str(case.postpartum_hours) if case.postpartum_hours is not None else "not entered"
    )

    danger_signs = ", ".join(case.danger_signs) if case.danger_signs else "not entered"
    interventions = (
        ", ".join(case.interventions_given) if case.interventions_given else "not entered"
    )

    return f"""
You are drafting a clinician-reviewable maternal referral handoff note for Mamathemba.

Rules:
- Do NOT diagnose.
- Do NOT recommend treatment.
- Do NOT add facts not present in the case or guidance.
- Keep the note factual, concise, and professional.
- The final line must remind the reader to verify receiving facility availability before transfer.
- The note must clearly state that final clinical and referral decisions remain with the clinician.

Write the output as plain text only.

CASE FACTS
Case ID: {case.patient_id}
Age: {case.age_years}
Pregnancy status: {case.pregnancy_status}
Gestational weeks: {gestational}
Postpartum hours: {postpartum}
Danger signs: {danger_signs}
Interventions already given: {interventions}
Transport mode: {case.transport_mode}
Clinician notes: {case.clinician_notes or "not entered"}

LOCAL SUMMARY
{summary}

GUIDANCE CONTEXT
{guidance_context}

Format:
Referral Handoff Draft — Mamathemba v1

Case ID:
Age:
Pregnancy status:
Gestational weeks:
Postpartum hours:

Observed danger signs:
Interventions already given:
Transport mode:

Clinician notes:

Referral-readiness summary:

Grounding notes:

Important:
""".strip()


def _build_local_handoff_note(
    case: CaseIntake,
    summary: str,
    guidance_context: str,
) -> str:
    gestational = (
        str(case.gestational_weeks) if case.gestational_weeks is not None else "not entered"
    )
    postpartum = (
        str(case.postpartum_hours) if case.postpartum_hours is not None else "not entered"
    )

    return (
        "Referral Handoff Draft — Mamathemba v1\n\n"
        f"Case ID: {case.patient_id}\n"
        f"Age: {case.age_years}\n"
        f"Pregnancy status: {case.pregnancy_status}\n"
        f"Gestational weeks: {gestational}\n"
        f"Postpartum hours: {postpartum}\n\n"
        f"Observed danger signs: {', '.join(case.danger_signs) or 'not entered'}\n"
        f"Interventions already given: {', '.join(case.interventions_given) or 'not entered'}\n"
        f"Transport mode: {case.transport_mode}\n\n"
        f"Clinician notes:\n{case.clinician_notes or 'not entered'}\n\n"
        "Referral-readiness summary:\n"
        f"{summary}\n\n"
        "Grounding notes:\n"
        "This draft is based on entered information and local maternal guidance context.\n\n"
        "Guidance context used:\n"
        f"{guidance_context[:700]}\n\n"
        "Important:\n"
        "Verify receiving facility availability and acceptance before transfer.\n"
        "Final clinical and referral decisions remain with the clinician."
    )


def build_referral_packet(case: CaseIntake) -> IntakeResponse:
    missing = get_missing_information(case)
    facilities = get_ranked_facilities(case)
    next_steps = get_next_steps(case)
    guidance_context = retrieve_guidance_context(case)
    summary = _build_local_summary(case, missing)

    watsonx_prompt = _build_watsonx_prompt(case, summary, guidance_context)
    watsonx_note = watsonx_client.generate_text(watsonx_prompt)

    draft_handoff_note = (
        watsonx_note.strip()
        if watsonx_note
        else _build_local_handoff_note(case, summary, guidance_context)
    )

    return IntakeResponse(
        case_id=case.patient_id,
        referral_readiness_summary=summary,
        missing_information=missing,
        facility_options=facilities,
        draft_handoff_note=draft_handoff_note,
        next_steps=next_steps,
    )