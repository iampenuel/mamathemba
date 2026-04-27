from __future__ import annotations

from backend.app.schemas.cases import CaseIntake


def get_missing_information(case: CaseIntake) -> list[str]:
    missing: list[str] = []

    if case.pregnancy_status == "pregnant" and case.gestational_weeks is None:
        missing.append("Gestational weeks not entered")

    if case.pregnancy_status == "postpartum" and case.postpartum_hours is None:
        missing.append("Postpartum hours not entered")

    if not case.danger_signs:
        missing.append("Danger signs not entered")

    if not case.transport_mode.strip():
        missing.append("Transport mode not entered")

    if case.vitals.systolic_bp is None or case.vitals.diastolic_bp is None:
        missing.append("Blood pressure incomplete")

    if case.vitals.heart_rate is None:
        missing.append("Heart rate not entered")

    if not case.clinician_notes or not case.clinician_notes.strip():
        missing.append("Clinician notes not entered")

    return missing


def get_next_steps(case: CaseIntake) -> list[str]:
    return [
        "Confirm receiving facility contact and acceptance.",
        "Review missing handoff fields before sending.",
        "Prepare referral documentation and packet for transfer.",
        "Confirm transport arrangement and escalation timing.",
        "Review case with supervising clinician if required.",
        "Confirm interventions already recorded in the packet.",
    ]
