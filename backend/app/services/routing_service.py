import json
import logging
import os
import urllib.error
import urllib.request
from math import atan2, cos, radians, sin, sqrt
from typing import Any
from urllib.parse import quote_plus

from app.services.geocoding_service import resolve_origin


logger = logging.getLogger(__name__)


def origin_is_precise(origin: dict[str, Any]) -> bool:
    return origin.get("precision") == "precise"


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    earth_radius_km = 6371.0

    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)

    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    )
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return earth_radius_km * c


def _offline_speed_kmh(transport_mode: str) -> int:
    mode = (transport_mode or "").strip().lower()

    if mode == "ambulance":
        return 60
    if mode in {"car", "vehicle"}:
        return 45
    return 35


def _offline_estimate(
    origin: dict[str, Any],
    destination: dict[str, Any],
    transport_mode: str,
) -> dict[str, Any]:
    distance_km = haversine_km(
        float(origin["lat"]),
        float(origin["lng"]),
        float(destination["lat"]),
        float(destination["lng"]),
    )
    return {
        "distance_km": round(distance_km, 1),
        "estimated_travel_time_min": None,
        "routing_provider": "offline_distance",
        "route_accuracy": "unavailable",
        "routing_note": "Straight-line distance only; no routed travel-time estimate.",
    }


def _google_route_estimate(
    origin: dict[str, Any],
    destination: dict[str, Any],
    transport_mode: str,
) -> dict[str, Any] | None:
    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not api_key:
        return None

    request_body = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": float(origin["lat"]),
                    "longitude": float(origin["lng"]),
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": float(destination["lat"]),
                    "longitude": float(destination["lng"]),
                }
            }
        },
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
    }

    request = urllib.request.Request(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        data=json.dumps(request_body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=4) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (OSError, urllib.error.URLError, json.JSONDecodeError):
        logger.exception("routing_service: Google Routes estimate failed")
        return None

    routes = data.get("routes") if isinstance(data, dict) else None
    if not routes:
        return None

    route = routes[0]
    duration = str(route.get("duration", "0s")).removesuffix("s")
    distance_meters = route.get("distanceMeters")

    try:
        seconds = float(duration)
        distance_km = float(distance_meters) / 1000 if distance_meters else None
    except (TypeError, ValueError):
        return None

    return {
        "distance_km": round(distance_km, 1) if distance_km is not None else None,
        "estimated_travel_time_min": max(round(seconds / 60), 1),
        "routing_provider": "google_routes",
        "route_accuracy": "precise" if origin_is_precise(origin) else "approximate",
        "routing_note": (
            "Google Routes routed travel-time estimate."
            if origin_is_precise(origin)
            else "Google Routes estimate from an approximate geocoded origin."
        ),
    }


def estimate_travel_time(
    origin: dict[str, Any],
    destination: dict[str, Any],
    transport_mode: str,
) -> dict[str, Any]:
    if os.getenv("MAPS_PROVIDER", "offline").strip().lower() == "google":
        google_estimate = _google_route_estimate(origin, destination, transport_mode)
        if google_estimate:
            return google_estimate

    return _offline_estimate(origin, destination, transport_mode)


def travel_time_band(minutes: int | None) -> str:
    if minutes is None:
        return "Route time unavailable"
    if minutes <= 30:
        return "0-30 min"
    if minutes <= 60:
        return "31-60 min"
    if minutes <= 90:
        return "61-90 min"
    return "90+ min"


def build_map_url(origin: dict[str, Any], destination: dict[str, Any]) -> str:
    destination_query = quote_plus(f"{destination['lat']},{destination['lng']}")

    return f"https://www.google.com/maps/dir/?api=1&destination={destination_query}"
