import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


logger = logging.getLogger(__name__)

PRECISE_GOOGLE_LOCATION_TYPES = {"ROOFTOP", "RANGE_INTERPOLATED"}

UNRESOLVED_LOCATION_WARNING = (
    "Location could not be resolved. Facility options were not generated because "
    "the current registry cannot safely match this address."
)
MISSING_LOCATION_WARNING = (
    "Enter the referring clinic or address to generate region-specific facility options."
)

LOCAL_GEOCODE_FIXTURES = [
    {
        "keywords": ["parktown", "charlotte maxeke", "jubilee"],
        "label": "Parktown, Johannesburg",
        "lat": -26.1768,
        "lng": 28.0448,
        "address": "Parktown, Johannesburg",
        "country_code": "ZA",
        "country": "South Africa",
        "admin1": "Gauteng",
        "admin2": "City of Johannesburg Metropolitan Municipality",
    },
    {
        "keywords": ["soweto", "diepkloof", "baragwanath", "chris hani"],
        "label": "Soweto, Johannesburg",
        "lat": -26.2623,
        "lng": 27.9395,
        "address": "Soweto, Johannesburg",
        "country_code": "ZA",
        "country": "South Africa",
        "admin1": "Gauteng",
        "admin2": "City of Johannesburg Metropolitan Municipality",
    },
    {
        "keywords": ["coronationville", "rahima moosa", "fuel road"],
        "label": "Coronationville, Johannesburg",
        "lat": -26.1783,
        "lng": 27.9824,
        "address": "Coronationville, Johannesburg",
        "country_code": "ZA",
        "country": "South Africa",
        "admin1": "Gauteng",
        "admin2": "City of Johannesburg Metropolitan Municipality",
    },
    {
        "keywords": ["germiston", "bertha gxowa"],
        "label": "Germiston, Johannesburg",
        "lat": -26.234,
        "lng": 28.1676,
        "address": "Germiston, Johannesburg",
        "country_code": "ZA",
        "country": "South Africa",
        "admin1": "Gauteng",
        "admin2": "Ekurhuleni Metropolitan Municipality",
    },
    {
        "keywords": ["edenvale", "rembrandt park"],
        "label": "Edenvale, Johannesburg",
        "lat": -26.1398,
        "lng": 28.1532,
        "address": "Edenvale, Johannesburg",
        "country_code": "ZA",
        "country": "South Africa",
        "admin1": "Gauteng",
        "admin2": "Ekurhuleni Metropolitan Municipality",
    },
    {
        "keywords": ["johannesburg", "joburg", "inner city", "cbd"],
        "label": "Johannesburg, Gauteng",
        "lat": -26.2041,
        "lng": 28.0473,
        "address": "Johannesburg, Gauteng",
        "country_code": "ZA",
        "country": "South Africa",
        "admin1": "Gauteng",
        "admin2": "City of Johannesburg Metropolitan Municipality",
    },
]


def _origin_from_coordinates(payload: dict[str, Any]) -> dict[str, Any] | None:
    lat = payload.get("origin_lat")
    lng = payload.get("origin_lng")

    if lat is None or lng is None:
        return None

    try:
        return {
            "label": payload.get("origin_label") or "Entered referring location",
            "lat": float(lat),
            "lng": float(lng),
            "address": payload.get("origin_address") or "",
            "source": payload.get("origin_source") or "coordinates",
            "status": "resolved",
            "precision": "precise",
            "place_types": [],
            "country_code": payload.get("origin_country_code") or "",
            "country": payload.get("origin_country") or "",
            "admin1": payload.get("origin_admin1") or "",
            "admin2": payload.get("origin_admin2") or "",
        }
    except (TypeError, ValueError):
        logger.warning("geocoding_service: invalid origin coordinates")
        return None


def _local_geocode(address: str) -> dict[str, Any] | None:
    normalized_address = address.strip().lower()
    if not normalized_address:
        return None

    for fixture in LOCAL_GEOCODE_FIXTURES:
        if any(keyword in normalized_address for keyword in fixture["keywords"]):
            return {
                "label": fixture["label"],
                "lat": fixture["lat"],
                "lng": fixture["lng"],
                "address": address,
                "source": "local_geocoder",
                "status": "resolved",
                "precision": "precise",
                "place_types": ["local_fixture"],
                "country_code": fixture["country_code"],
                "country": fixture["country"],
                "admin1": fixture["admin1"],
                "admin2": fixture["admin2"],
            }

    return None


def _address_component_metadata(result: dict[str, Any]) -> dict[str, str]:
    components = result.get("address_components")
    metadata = {
        "country_code": "",
        "country": "",
        "admin1": "",
        "admin2": "",
    }

    if not isinstance(components, list):
        return metadata

    for component in components:
        if not isinstance(component, dict):
            continue

        types = component.get("types")
        if not isinstance(types, list):
            continue

        long_name = str(component.get("long_name") or "")
        short_name = str(component.get("short_name") or "")

        if "country" in types:
            metadata["country"] = long_name
            metadata["country_code"] = short_name.upper()
        elif "administrative_area_level_1" in types:
            metadata["admin1"] = long_name
        elif "administrative_area_level_2" in types:
            metadata["admin2"] = long_name

    return metadata


def _google_geocode(address: str) -> dict[str, Any] | None:
    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not api_key:
        return None

    params_payload = {
        "address": address,
        "key": api_key,
    }
    geocoding_region = os.getenv("GOOGLE_GEOCODING_REGION", "").strip()
    if geocoding_region:
        params_payload["region"] = geocoding_region

    params = urllib.parse.urlencode(params_payload)
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{params}"

    try:
        with urllib.request.urlopen(url, timeout=4) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (OSError, urllib.error.URLError, json.JSONDecodeError):
        logger.exception("geocoding_service: Google geocoding failed")
        return None

    results = data.get("results") if isinstance(data, dict) else None
    if not results:
        return None

    result = results[0]
    geometry = result.get("geometry", {})
    location = geometry.get("location", {})
    location_type = str(geometry.get("location_type") or "")
    result_types = result.get("types") if isinstance(result.get("types"), list) else []
    lat = location.get("lat")
    lng = location.get("lng")

    if lat is None or lng is None:
        return None

    address_metadata = _address_component_metadata(result)

    return {
        "label": result.get("formatted_address") or address,
        "lat": float(lat),
        "lng": float(lng),
        "address": result.get("formatted_address") or address,
        "source": "google_geocoding",
        "status": "resolved",
        "precision": (
            "precise" if location_type in PRECISE_GOOGLE_LOCATION_TYPES else "approximate"
        ),
        "place_types": [str(item) for item in result_types],
        "location_type": location_type,
        **address_metadata,
    }


def resolve_origin(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = payload or {}
    coordinate_origin = _origin_from_coordinates(payload)

    if coordinate_origin:
        return coordinate_origin

    address = str(payload.get("origin_address") or payload.get("origin_label") or "")
    local_origin = _local_geocode(address)
    if local_origin:
        return local_origin

    if os.getenv("MAPS_PROVIDER", "offline").strip().lower() == "google" and address:
        google_origin = _google_geocode(address)
        if google_origin:
            return google_origin

    return {
        "label": address or "Referring location not entered",
        "lat": None,
        "lng": None,
        "address": address,
        "source": "unresolved",
        "status": "unresolved",
        "precision": "unavailable",
        "place_types": [],
        "warning": UNRESOLVED_LOCATION_WARNING if address else MISSING_LOCATION_WARNING,
    }
