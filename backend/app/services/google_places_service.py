import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any


logger = logging.getLogger(__name__)

PLACES_NEARBY_SEARCH_URL = "https://places.googleapis.com/v1/places:searchNearby"
PLACES_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.types",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.googleMapsUri",
        "places.businessStatus",
    ]
)


def _maps_enabled() -> bool:
    return (
        os.getenv("MAPS_PROVIDER", "offline").strip().lower() == "google"
        and bool(os.getenv("GOOGLE_MAPS_API_KEY", "").strip())
    )


def _safe_radius_meters() -> float:
    try:
        radius = float(os.getenv("GOOGLE_PLACES_RADIUS_METERS", "50000"))
    except ValueError:
        radius = 50000

    return min(max(radius, 1000), 50000)


def _display_name(place: dict[str, Any]) -> str:
    display_name = place.get("displayName")
    if isinstance(display_name, dict):
        text = display_name.get("text")
        if isinstance(text, str) and text.strip():
            return text.strip()

    return str(place.get("id") or "Google Places hospital result")


def _place_to_facility(place: dict[str, Any]) -> dict[str, Any] | None:
    location = place.get("location")
    if not isinstance(location, dict):
        return None

    lat = location.get("latitude")
    lng = location.get("longitude")
    if lat is None or lng is None:
        return None

    place_id = str(place.get("id") or "").strip()
    if not place_id:
        return None

    business_status = str(place.get("businessStatus") or "").upper()
    if business_status == "CLOSED_PERMANENTLY":
        return None

    phone = str(
        place.get("nationalPhoneNumber")
        or place.get("internationalPhoneNumber")
        or ""
    )

    return {
        "id": f"GOOGLE-{place_id}",
        "google_place_id": place_id,
        "name": _display_name(place),
        "facility_type": "Hospital or health facility",
        "address": str(place.get("formattedAddress") or ""),
        "phone": phone,
        "lat": float(lat),
        "lng": float(lng),
        "capability_level": "identity_only",
        "services": {
            "accepts_obstetric_referrals": "unknown",
            "maternal_stabilization": "unknown",
            "blood_support": "unknown",
            "operative_capability": "unknown",
        },
        "capabilities": [
            "Live facility identity from Google Places",
            "Clinical services not scored",
            "Clinician must confirm receiving capability, availability, and acceptance before transfer",
        ],
        "source": "Google Places",
        "source_url": str(place.get("googleMapsUri") or ""),
        "source_license": "Google Maps Platform terms",
        "metadata_confidence": "live_google_identity",
        "capability_verification_level": "live_google_identity",
        "identity_verification_source": "Google Places live lookup",
        "identity_verified_at": "",
        "clinical_metadata_source": "",
        "clinical_metadata_reviewed_at": "",
        "clinical_metadata_reviewed_by": "",
        "clinical_metadata_expires_at": "",
        "verification_status": (
            "Live facility identity from Google Places; clinician must confirm receiving capability, availability, and acceptance before transfer."
        ),
        "data_notes": (
            "Google Places supplies facility identity and location only. "
            "Mamathemba does not infer obstetric capability, blood support, "
            "operative capability, bed availability, or referral acceptance from Google Places."
        ),
    }


def search_nearby_hospitals(
    origin: dict[str, Any],
    *,
    max_results: int = 8,
) -> list[dict[str, Any]]:
    if not _maps_enabled():
        return []

    if origin.get("lat") is None or origin.get("lng") is None:
        return []

    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    request_body = {
        "includedTypes": ["hospital"],
        "maxResultCount": min(max(max_results, 1), 20),
        "rankPreference": "DISTANCE",
        "locationRestriction": {
            "circle": {
                "center": {
                    "latitude": float(origin["lat"]),
                    "longitude": float(origin["lng"]),
                },
                "radius": _safe_radius_meters(),
            }
        },
    }

    request = urllib.request.Request(
        PLACES_NEARBY_SEARCH_URL,
        data=json.dumps(request_body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": PLACES_FIELD_MASK,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (OSError, urllib.error.URLError, json.JSONDecodeError):
        logger.exception("google_places_service: nearby hospital search failed")
        return []

    places = data.get("places") if isinstance(data, dict) else None
    if not isinstance(places, list):
        return []

    facilities: list[dict[str, Any]] = []
    for place in places:
        if not isinstance(place, dict):
            continue

        facility = _place_to_facility(place)
        if facility:
            facility["country_code"] = str(origin.get("country_code") or "")
            facility["country"] = str(origin.get("country") or "")
            facility["admin1"] = str(origin.get("admin1") or "")
            facility["admin2"] = str(origin.get("admin2") or "")
            facilities.append(facility)

    return facilities
