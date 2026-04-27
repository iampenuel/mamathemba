from typing import Optional
from pydantic import BaseModel, Field

class HandoffDraftRequest(BaseModel):
    pregnancy_status: str = Field(..., examples=["postpartum"])
    postpartum_hours: Optional[int] = Field(default=None, examples=[6])
    danger_signs: list[str] = Field(default_factory=list)
    transport_mode: str = Field(..., examples=["ambulance"])
    blood_pressure: str = Field(..., examples=["88/56"])
    heart_rate: int = Field(..., examples=[122])
    interventions_given: list[str] = Field(default_factory=list)
    clinician_note: str