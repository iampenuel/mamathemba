from typing import List, Literal, Optional
from pydantic import BaseModel, Field


PregnancyStatus = Literal["pregnant", "postpartum"]


class VitalSigns(BaseModel):
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    temperature_c: Optional[float] = None


class CaseIntake(BaseModel):
    patient_id: str = Field(..., description="Synthetic case ID")
    age_years: int = Field(..., ge=12, le=60)
    pregnancy_status: PregnancyStatus
    gestational_weeks: Optional[int] = Field(default=None, ge=1, le=45)
    postpartum_hours: Optional[int] = Field(default=None, ge=0, le=720)

    danger_signs: List[str] = Field(default_factory=list)
    interventions_given: List[str] = Field(default_factory=list)

    transport_mode: str
    origin_label: Optional[str] = None
    origin_address: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    origin_source: Optional[str] = None
    origin_country_code: Optional[str] = None
    origin_country: Optional[str] = None
    origin_admin1: Optional[str] = None
    origin_admin2: Optional[str] = None
    clinician_notes: Optional[str] = None
    vitals: VitalSigns = Field(default_factory=VitalSigns)


class FacilityOption(BaseModel):
    facility_id: Optional[str] = None
    google_place_id: Optional[str] = None
    facility_name: str
    facility_type: Optional[str] = None
    country_code: Optional[str] = None
    country: Optional[str] = None
    admin1: Optional[str] = None
    admin2: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    capability_level: str
    travel_time_band: str
    distance_km: Optional[float] = None
    estimated_travel_time_min: Optional[int] = None
    map_url: Optional[str] = None
    routing_provider: Optional[str] = None
    route_accuracy: Optional[str] = None
    routing_note: Optional[str] = None
    ranking_basis: Optional[str] = None
    origin_label: Optional[str] = None
    origin_address: Optional[str] = None
    origin_source: Optional[str] = None
    origin_status: Optional[str] = None
    origin_country_code: Optional[str] = None
    origin_country: Optional[str] = None
    origin_precision: Optional[str] = None
    origin_place_types: List[str] = Field(default_factory=list)
    origin_location_type: Optional[str] = None
    origin_warning: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    source_license: Optional[str] = None
    metadata_confidence: Optional[str] = None
    capability_verification_level: Optional[str] = None
    last_reviewed: Optional[str] = None
    identity_verification_source: Optional[str] = None
    identity_verified_at: Optional[str] = None
    clinical_metadata_source: Optional[str] = None
    clinical_metadata_reviewed_at: Optional[str] = None
    clinical_metadata_reviewed_by: Optional[str] = None
    clinical_metadata_expires_at: Optional[str] = None
    verification_status: Optional[str] = None
    data_notes: Optional[str] = None
    capabilities: List[str] = Field(default_factory=list)
    rationale: List[str]
    score: int


class IntakeResponse(BaseModel):
    case_id: str
    referral_readiness_summary: str
    missing_information: List[str]
    facility_options: List[FacilityOption]
    draft_handoff_note: str
    next_steps: List[str]
