from __future__ import annotations

from backend.app.schemas.cases import CaseIntake, IntakeResponse


def build_orchestrate_payload(case: CaseIntake, packet: IntakeResponse) -> dict:
    """Placeholder adapter for Phase 1.

    In Phase 2, this is where you'll prepare tool payloads or workflow state
    for watsonx Orchestrate.
    """
    return {
        "case_id": case.patient_id,
        "pregnancy_status": case.pregnancy_status,
        "danger_signs": case.danger_signs,
        "selected_top_facility": packet.facility_options[0].facility_name
        if packet.facility_options
        else None,
        "missing_information": packet.missing_information,
        "next_steps": packet.next_steps,
    }
