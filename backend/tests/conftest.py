from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.api.routes import cases as cases_routes
from app.main import app


class StubWatsonxService:
    def generate_handoff_draft(self, **kwargs):
        return (
            "Referral Summary:\n"
            "Synthetic handoff draft for clinician review.\n\n"
            "Current Concerns Observed:\n"
            "severe bleeding\n\n"
            "Interventions Already Documented:\n"
            "IV fluids\n\n"
            "Information to Verify Before Transfer:\n"
            "Confirm receiving facility availability before transfer. "
            "Final referral decisions remain with the clinician."
        )


@pytest.fixture
def demo_case_payload():
    return {
        "patient_id": "demo-case-001",
        "age_years": 28,
        "pregnancy_status": "postpartum",
        "postpartum_hours": 4,
        "danger_signs": ["severe bleeding", "dizziness"],
        "transport_mode": "ambulance",
        "interventions_given": ["IV fluids"],
        "systolic_bp": 88,
        "diastolic_bp": 56,
        "heart_rate": 124,
        "clinician_notes": "Synthetic demo case for referral handoff review.",
        "origin_label": "Demo clinic",
        "origin_country_code": "ZA",
        "origin_country": "South Africa",
        "origin_admin1": "Gauteng",
        "origin_lat": -26.2,
        "origin_lng": 28.04,
    }


@pytest.fixture
def sample_facility():
    return {
        "facility_id": "demo-hospital",
        "facility_name": "Demo District Hospital",
        "facility_type": "District hospital",
        "country_code": "ZA",
        "country": "South Africa",
        "admin1": "Gauteng",
        "admin2": "Demo district",
        "address": "Synthetic address",
        "phone": "+27000000000",
        "lat": -26.18,
        "lng": 28.03,
        "capability_level": "regional",
        "travel_time_band": "31-60 min",
        "distance_km": 12.4,
        "estimated_travel_time_min": 35,
        "routing_provider": "offline_distance",
        "route_accuracy": "unavailable",
        "ranking_basis": "curated_capability_and_route",
        "metadata_confidence": "reviewed_clinical_metadata",
        "capability_verification_level": "reviewed_clinical_metadata",
        "verification_status": (
            "Reviewed clinical metadata; clinician must confirm receiving "
            "capability, availability, and acceptance before transfer."
        ),
        "capabilities": ["Maternal stabilization listed"],
        "rationale": [
            "Maternal stabilization listed for clinician verification",
            "Clinician must confirm receiving capability, availability, and acceptance before transfer",
        ],
        "score": 42,
    }


@pytest.fixture
def client(monkeypatch, sample_facility):
    monkeypatch.setattr(
        cases_routes,
        "get_watsonx_service",
        lambda: StubWatsonxService(),
    )
    monkeypatch.setattr(
        cases_routes,
        "resolve_origin",
        lambda payload: {
            "status": "resolved",
            "lat": payload.get("origin_lat"),
            "lng": payload.get("origin_lng"),
            "label": payload.get("origin_label"),
            "country_code": payload.get("origin_country_code"),
            "country": payload.get("origin_country"),
            "precision": "precise",
        },
    )
    monkeypatch.setattr(
        cases_routes,
        "rank_facilities",
        lambda payload, resolved_origin=None: [sample_facility],
    )
    return TestClient(app)
