import json
import logging
from pathlib import Path
from typing import Any

from app.services.africa_boundary import (
    facility_discovery_warning,
    normalize_country_code,
)
from app.services.google_places_service import search_nearby_hospitals
from app.services.routing_service import (
    build_map_url,
    estimate_travel_time,
    resolve_origin,
    travel_time_band,
)


CANDIDATE_PATHS = [
    Path(__file__).resolve().parents[2] / "data" / "facilities.json",   # backend/data/facilities.json
    Path(__file__).resolve().parents[3] / "data" / "facilities.json",   # repo-root data/facilities.json
]

logger = logging.getLogger(__name__)

LEGACY_METADATA_CONFIDENCE = {
    "curated_clinical": "reviewed_clinical_metadata",
    "source_tracked_identity": "source_verified_identity",
    "google_places_live": "live_google_identity",
    "unverified": "live_google_identity",
}


def _find_data_path() -> Path | None:
    for path in CANDIDATE_PATHS:
        if path.exists():
            return path
    return None


def load_facilities() -> list[dict]:
    path = _find_data_path()
    if path is None:
        logger.warning("facility_matcher: no facilities.json file found")
        return []

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        logger.exception(
            "facility_matcher: failed to load facilities from %s", path
        )
        return []

    if not isinstance(data, list):
        logger.warning("facility_matcher: facilities.json must contain a JSON list")
        return []

    facilities: list[dict] = []
    for item in data:
        if isinstance(item, dict):
            facilities.append(item)
        else:
            logger.warning(
                "facility_matcher: skipping non-object facility entry: %r", item
            )

    return facilities


def _service_enabled(facility: dict[str, Any], service_name: str) -> bool:
    services = facility.get("services")
    if isinstance(services, dict) and service_name in services:
        value = services.get(service_name)
    else:
        value = facility.get(service_name)

    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() == "true"
    return False


def _metadata_confidence(facility: dict[str, Any]) -> str:
    if facility.get("source") == "Google Places":
        return "live_google_identity"

    value = str(facility.get("metadata_confidence") or "").strip()
    return LEGACY_METADATA_CONFIDENCE.get(value, value) or "reviewed_clinical_metadata"


def _capability_verification_level(facility: dict[str, Any]) -> str:
    if facility.get("source") == "Google Places":
        return "live_google_identity"

    value = str(facility.get("capability_verification_level") or "").strip()
    return LEGACY_METADATA_CONFIDENCE.get(value, value) or _metadata_confidence(facility)


def _ranking_basis(facility: dict[str, Any]) -> str:
    metadata_confidence = _metadata_confidence(facility)

    if metadata_confidence == "live_google_identity":
        return "google_route_only"
    if metadata_confidence == "source_verified_identity":
        return "source_tracked_identity_route"
    return "curated_capability_and_route"


def _facility_matches_origin_country(
    facility: dict[str, Any],
    origin_country_code: str,
) -> bool:
    if not origin_country_code:
        return True

    facility_country_code = normalize_country_code(facility.get("country_code"))
    return not facility_country_code or facility_country_code == origin_country_code


def _capabilities(facility: dict[str, Any]) -> list[str]:
    capabilities = facility.get("capabilities")
    if isinstance(capabilities, list):
        return [str(item) for item in capabilities if str(item).strip()]

    labels: list[str] = []
    if _service_enabled(facility, "operative_capability"):
        labels.append("Operative capability listed")
    if _service_enabled(facility, "blood_support"):
        labels.append("Blood support listed")
    if _service_enabled(facility, "maternal_stabilization"):
        labels.append("Maternal stabilization listed")
    if _service_enabled(facility, "accepts_obstetric_referrals"):
        labels.append("Obstetric referral pathway listed")
    return labels


def _contains_danger_sign(danger_signs: list[str], expected: str) -> bool:
    normalized_expected = expected.replace("_", " ").lower()

    for sign in danger_signs:
        normalized_sign = sign.replace("_", " ").lower()
        if normalized_expected in normalized_sign:
            return True

    return False


def score_facility(
    facility: dict,
    payload: dict,
    origin: dict[str, Any],
) -> dict:
    required_keys = ["id", "name", "lat", "lng", "capability_level"]
    for key in required_keys:
        if key not in facility:
            raise KeyError(f"facility is missing required key: {key}")

    danger_signs = [str(x).lower() for x in payload.get("danger_signs", [])]
    transport_mode = payload.get("transport_mode", "")
    pregnancy_status = str(payload.get("pregnancy_status", "")).lower()
    emergency_maternal_context = (
        pregnancy_status == "postpartum"
        or _contains_danger_sign(danger_signs, "severe bleeding")
        or _contains_danger_sign(danger_signs, "dizziness")
    )
    destination = {
        "lat": float(facility["lat"]),
        "lng": float(facility["lng"]),
    }

    travel_estimate = estimate_travel_time(origin, destination, transport_mode)
    estimated_travel_time_min = travel_estimate.get("estimated_travel_time_min")

    score = 0
    rationale: list[str] = []
    metadata_confidence = _metadata_confidence(facility)
    capability_verification_level = _capability_verification_level(facility)
    is_google_places_result = metadata_confidence == "live_google_identity"
    is_source_tracked_identity = metadata_confidence == "source_verified_identity"
    route_accuracy = str(travel_estimate.get("route_accuracy") or "unavailable")
    ranking_basis = _ranking_basis(facility)

    if is_google_places_result:
        rationale.append("Live facility identity from Google Places")
        rationale.append(
            "Clinician must confirm receiving capability, availability, and acceptance before transfer"
        )
    elif is_source_tracked_identity:
        rationale.append("Source-verified facility identity")
        rationale.append(
            "Clinician must confirm receiving capability, availability, and acceptance before transfer"
        )

    is_curated_clinical = ranking_basis == "curated_capability_and_route"

    if is_curated_clinical and _service_enabled(facility, "accepts_obstetric_referrals"):
        score += 15
        rationale.append("Accepts obstetric referrals")

    if is_curated_clinical and _service_enabled(facility, "maternal_stabilization"):
        score += 15
        rationale.append("Maternal stabilization available")

    capability_level = str(facility.get("capability_level", "")).lower()
    if not is_curated_clinical and not is_google_places_result:
        rationale.append("Clinical services are not scored for this option")
    elif capability_level == "comprehensive":
        score += 20
        rationale.append("Comprehensive capability level")
    elif capability_level == "regional":
        score += 12
        rationale.append("Regional capability level")
    elif capability_level == "basic":
        score += 5
        rationale.append("Basic capability level")
    elif capability_level == "specialized":
        score += 18
        rationale.append("Specialized maternal facility")
    elif capability_level in {"unverified", "identity_only"}:
        rationale.append("Facility identity available; clinical services not scored")

    if emergency_maternal_context:
        if (
            ranking_basis == "curated_capability_and_route"
            and _service_enabled(facility, "blood_support")
        ):
            score += 20
            rationale.append("Blood support available")
        if (
            ranking_basis == "curated_capability_and_route"
            and _service_enabled(facility, "operative_capability")
        ):
            score += 20
            rationale.append("Operative capability available")

    if (
        is_google_places_result
        and estimated_travel_time_min is not None
        and route_accuracy == "approximate"
    ):
        rationale.append("Approximate route time from geocoded area center")
    elif estimated_travel_time_min is not None and estimated_travel_time_min <= 30:
        score += 15 if is_curated_clinical else 0
        rationale.append("Shorter travel time")
    elif estimated_travel_time_min is not None and estimated_travel_time_min <= 60:
        score += 10 if is_curated_clinical else 0
        rationale.append("Moderate travel time")
    elif estimated_travel_time_min is not None and estimated_travel_time_min <= 90:
        score += 4 if is_curated_clinical else 0
        rationale.append("Longer but potentially reachable travel time")

    if is_google_places_result and route_accuracy == "approximate":
        rationale.append(
            "Route estimate uses an approximate area-level origin; enter a clinic or street address for more accurate routing"
        )

    origin_warning = origin.get("warning")
    if origin_warning:
        rationale.append(str(origin_warning))

    return {
        "facility_id": facility["id"],
        "google_place_id": facility.get("google_place_id"),
        "facility_name": facility["name"],
        "facility_type": facility.get("facility_type", "Hospital"),
        "country_code": facility.get("country_code", ""),
        "country": facility.get("country", ""),
        "admin1": facility.get("admin1", ""),
        "admin2": facility.get("admin2", ""),
        "address": facility.get("address", ""),
        "phone": facility.get("phone", ""),
        "lat": float(facility["lat"]),
        "lng": float(facility["lng"]),
        "capability_level": facility["capability_level"],
        "distance_km": travel_estimate.get("distance_km"),
        "estimated_travel_time_min": estimated_travel_time_min,
        "travel_time_band": travel_time_band(estimated_travel_time_min),
        "map_url": build_map_url(origin, destination),
        "source": facility.get("source", "Curated facility registry"),
        "source_url": facility.get("source_url", ""),
        "source_license": facility.get("source_license", ""),
        "metadata_confidence": metadata_confidence,
        "capability_verification_level": capability_verification_level,
        "last_reviewed": facility.get("last_reviewed", ""),
        "identity_verification_source": facility.get("identity_verification_source", ""),
        "identity_verified_at": facility.get("identity_verified_at", ""),
        "clinical_metadata_source": facility.get("clinical_metadata_source", ""),
        "clinical_metadata_reviewed_at": facility.get(
            "clinical_metadata_reviewed_at", ""
        ),
        "clinical_metadata_reviewed_by": facility.get(
            "clinical_metadata_reviewed_by", ""
        ),
        "clinical_metadata_expires_at": facility.get(
            "clinical_metadata_expires_at", ""
        ),
        "verification_status": facility.get(
            "verification_status",
            "Facility identity source-tracked; clinician must confirm receiving capability, availability, and acceptance before transfer",
        ),
        "data_notes": facility.get("data_notes", ""),
        "capabilities": _capabilities(facility),
        "routing_provider": travel_estimate.get("routing_provider"),
        "route_accuracy": route_accuracy,
        "routing_note": travel_estimate.get("routing_note"),
        "ranking_basis": ranking_basis,
        "origin_label": origin.get("label", ""),
        "origin_address": origin.get("address", ""),
        "origin_source": origin.get("source", ""),
        "origin_status": origin.get("status", ""),
        "origin_country_code": origin.get("country_code", ""),
        "origin_country": origin.get("country", ""),
        "origin_precision": origin.get("precision", ""),
        "origin_place_types": origin.get("place_types", []),
        "origin_location_type": origin.get("location_type", ""),
        "origin_warning": origin_warning,
        "score": score,
        "rationale": rationale,
    }


def _sort_ranked_facilities(ranked: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked.sort(
        key=lambda item: (
            -int(item.get("score", 0))
            if item.get("ranking_basis") == "curated_capability_and_route"
            else 0,
            item.get("estimated_travel_time_min")
            if item.get("estimated_travel_time_min") is not None
            else 9999,
            item.get("distance_km") if item.get("distance_km") is not None else 9999,
        )
    )
    return ranked


def rank_facilities(
    payload: dict,
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    resolved_origin: dict[str, Any] | None = None,
) -> list[dict]:
    facilities = load_facilities()
    ranked: list[dict] = []
    origin_payload = dict(payload)

    if origin_lat is not None and origin_lng is not None:
        origin_payload["origin_lat"] = origin_lat
        origin_payload["origin_lng"] = origin_lng

    origin = resolved_origin or resolve_origin(origin_payload)
    if (
        origin.get("status") != "resolved"
        or origin.get("lat") is None
        or origin.get("lng") is None
    ):
        logger.info(
            "facility_matcher: no facility ranking because origin is unresolved: %s",
            origin.get("label"),
        )
        return []

    africa_warning = facility_discovery_warning(origin)
    if africa_warning:
        origin["warning"] = africa_warning
        logger.info(
            "facility_matcher: facility discovery blocked by Africa boundary for origin %s",
            origin.get("label"),
        )
        return []

    origin_country_code = normalize_country_code(origin.get("country_code"))
    country_candidates = [
        facility
        for facility in facilities
        if _facility_matches_origin_country(facility, origin_country_code)
    ]

    for facility in country_candidates:
        try:
            ranked.append(score_facility(facility, payload, origin))
        except Exception as exc:
            facility_id = facility.get("id", "<unknown>")
            logger.warning(
                "facility_matcher: skipping invalid facility record %s: %s",
                facility_id,
                exc,
            )

    max_distance_km = 150
    nearby_candidates = [
        item
        for item in sorted(
            ranked,
            key=lambda item: (
                item.get("distance_km")
                if item.get("distance_km") is not None
                else 9999
            ),
        )
        if item.get("distance_km") is None or item.get("distance_km") <= max_distance_km
    ][:8]

    if not nearby_candidates:
        logger.info(
            "facility_matcher: no candidates within %skm of origin %s",
            max_distance_km,
            origin.get("label"),
        )
        google_places_facilities = search_nearby_hospitals(origin)
        google_places_ranked: list[dict[str, Any]] = []
        for facility in google_places_facilities:
            try:
                google_places_ranked.append(score_facility(facility, payload, origin))
            except Exception as exc:
                facility_id = facility.get("id", "<unknown>")
                logger.warning(
                    "facility_matcher: skipping invalid Google Places facility %s: %s",
                    facility_id,
                    exc,
                )

        return _sort_ranked_facilities(google_places_ranked)[:3]

    return _sort_ranked_facilities(nearby_candidates)[:3]


def get_ranked_facilities(case: Any) -> list[dict]:
    """Compatibility helper for older packet-building services."""
    return rank_facilities(
        {
            "danger_signs": getattr(case, "danger_signs", []),
            "transport_mode": getattr(case, "transport_mode", ""),
        }
    )[:4]
