from app.api.routes import handoff as handoff_routes


def _handoff_payload():
    return {
        "pregnancy_status": "postpartum",
        "postpartum_hours": 6,
        "danger_signs": ["severe bleeding", "dizziness"],
        "transport_mode": "ambulance",
        "blood_pressure": "88/56",
        "heart_rate": 122,
        "interventions_given": ["uterine massage", "iv fluids"],
        "clinician_note": "Ongoing bleeding observed during referral preparation.",
    }


def test_handoff_draft_uses_safe_fallback_when_watsonx_generation_fails(
    client,
    monkeypatch,
):
    class FailingWatsonxService:
        def generate_handoff_draft(self, **kwargs):
            raise RuntimeError("watsonx generation unavailable in test")

    monkeypatch.setattr(
        handoff_routes,
        "get_watsonx_service",
        lambda: FailingWatsonxService(),
    )

    response = client.post("/api/handoff/draft", json=_handoff_payload())

    assert response.status_code == 200
    assert set(response.json()) == {"draft"}
    draft = response.json()["draft"]
    assert "Referral Summary:" in draft
    assert "Information to Verify Before Transfer:" in draft
    assert "Confirm receiving facility availability before transfer." in draft
    assert "Final referral decisions remain with the clinician." in draft


def test_handoff_unexpected_failure_returns_generic_public_error(
    client,
    monkeypatch,
):
    raw_error = "raw handoff exception detail should not be public"

    class UnexpectedWatsonxService:
        def generate_handoff_draft(self, **kwargs):
            raise AssertionError(raw_error)

    monkeypatch.setattr(
        handoff_routes,
        "get_watsonx_service",
        lambda: UnexpectedWatsonxService(),
    )

    response = client.post("/api/handoff/draft", json=_handoff_payload())

    assert response.status_code == 500
    assert response.json()["detail"] == "Could not generate handoff draft."
    assert raw_error not in response.text
