from app.api.routes import cases as cases_routes


FORBIDDEN_SAFETY_CLAIMS = [
    "diagnosis:",
    "diagnosed with",
    "autonomous triage",
    "treatment plan",
    "treatment planning",
    "administer medication",
    "medication advice",
    "dispatch ambulance",
    "ambulance dispatched",
    "replace the clinician",
    "replaces clinician",
    "no clinician review needed",
]


def _response_text(data):
    parts = [
        data.get("referral_readiness_summary", ""),
        data.get("draft_handoff_note", ""),
        " ".join(data.get("missing_information", [])),
        " ".join(data.get("next_steps", [])),
    ]
    for facility in data.get("facility_options", []):
        parts.extend(
            [
                facility.get("facility_name", ""),
                facility.get("verification_status", ""),
                " ".join(facility.get("rationale", [])),
            ]
        )
    return "\n".join(parts).lower()


def test_intake_returns_review_packet_for_demo_case(client, demo_case_payload):
    response = client.post("/api/cases/intake", json=demo_case_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == demo_case_payload["patient_id"]
    assert "Urgent maternal referral case" in data["referral_readiness_summary"]
    assert isinstance(data["missing_information"], list)
    assert len(data["facility_options"]) == 1
    assert data["facility_options"][0]["facility_name"] == "Demo District Hospital"
    assert "Referral Summary:" in data["draft_handoff_note"]
    assert len(data["next_steps"]) > 0


def test_intake_reports_missing_clinician_note(client, demo_case_payload):
    payload = {**demo_case_payload, "clinician_notes": ""}

    response = client.post("/api/cases/intake", json=payload)

    assert response.status_code == 200
    assert "Clinician note not documented." in response.json()["missing_information"]


def test_intake_uses_safe_handoff_fallback_when_watsonx_unavailable(
    client,
    monkeypatch,
    demo_case_payload,
):
    def raise_watsonx_unavailable():
        raise RuntimeError("watsonx unavailable in test")

    monkeypatch.setattr(
        cases_routes,
        "get_watsonx_service",
        raise_watsonx_unavailable,
    )

    response = client.post("/api/cases/intake", json=demo_case_payload)

    assert response.status_code == 200
    draft = response.json()["draft_handoff_note"]
    assert "Referral Summary:" in draft
    assert "Information to Verify Before Transfer:" in draft
    assert "Confirm receiving facility availability before transfer." in draft
    assert "Final referral decisions remain with the clinician." in draft


def test_facility_matching_failure_is_non_fatal(client, monkeypatch, demo_case_payload):
    def raise_facility_failure(payload, resolved_origin=None):
        raise RuntimeError("facility matcher unavailable in test")

    monkeypatch.setattr(cases_routes, "rank_facilities", raise_facility_failure)

    response = client.post("/api/cases/intake", json=demo_case_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == demo_case_payload["patient_id"]
    assert data["facility_options"] == []
    assert data["draft_handoff_note"]
    assert data["next_steps"]


def test_generated_safety_copy_stays_inside_product_boundary(
    client,
    demo_case_payload,
):
    response = client.post("/api/cases/intake", json=demo_case_payload)

    assert response.status_code == 200
    text = _response_text(response.json())
    for forbidden_claim in FORBIDDEN_SAFETY_CLAIMS:
        assert forbidden_claim not in text
