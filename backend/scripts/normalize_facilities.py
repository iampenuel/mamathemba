#!/usr/bin/env python3
"""Normalize source-tracked facility files into Mamathemba registry JSON.

The script intentionally defaults clinical capability fields to "unknown".
Only manually/source-reviewed registry entries should upgrade those fields.
"""

import argparse
import csv
import json
from pathlib import Path
from typing import Any


SERVICE_FIELDS = [
    "accepts_obstetric_referrals",
    "maternal_stabilization",
    "blood_support",
    "operative_capability",
]


def _first_value(properties: dict[str, Any], keys: list[str]) -> str:
    for key in keys:
        value = properties.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def _parse_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _facility_from_properties(
    properties: dict[str, Any],
    *,
    lat: float | None,
    lng: float | None,
    source_url: str,
    source_license: str,
    country_code: str,
    country: str,
) -> dict[str, Any] | None:
    name = _first_value(
        properties,
        ["name", "facility_name", "facility", "health_facility_name", "amenity"],
    )

    if not name or lat is None or lng is None:
        return None

    source_id = _first_value(
        properties,
        ["id", "uuid", "osm_id", "facility_id", "global_id"],
    )
    facility_id = source_id or f"{country_code}-{name}".upper().replace(" ", "-")

    return {
        "id": facility_id,
        "name": name,
        "facility_type": _first_value(
            properties,
            ["facility_type", "type", "amenity", "healthcare"],
        )
        or "Health facility",
        "country_code": country_code,
        "country": country,
        "admin1": _first_value(
            properties,
            ["admin1", "province", "state", "region"],
        ),
        "admin2": _first_value(
            properties,
            ["admin2", "district", "county", "municipality", "lga"],
        ),
        "address": _first_value(
            properties,
            ["address", "addr_full", "formatted_address", "street"],
        ),
        "phone": _first_value(properties, ["phone", "contact", "telephone"]),
        "lat": lat,
        "lng": lng,
        "capability_level": "identity_only",
        "services": {field: "unknown" for field in SERVICE_FIELDS},
        "capabilities": [
            "Source-verified facility identity",
            "Clinical services not scored",
            "Clinician must confirm receiving capability, availability, and acceptance before transfer",
        ],
        "source": _first_value(properties, ["source", "dataset"])
        or "Source-tracked facility import",
        "source_url": source_url,
        "source_license": source_license,
        "metadata_confidence": "source_verified_identity",
        "capability_verification_level": "source_verified_identity",
        "last_reviewed": "",
        "identity_verification_source": source_url,
        "identity_verified_at": "",
        "clinical_metadata_source": "",
        "clinical_metadata_reviewed_at": "",
        "clinical_metadata_reviewed_by": "",
        "clinical_metadata_expires_at": "",
        "verification_status": (
            "Source-verified facility identity; clinician must confirm receiving "
            "capability, availability, and acceptance before transfer."
        ),
        "data_notes": (
            "Imported as identity/location metadata only. Do not infer blood "
            "support, operative capability, obstetric referral acceptance, "
            "or maternal stabilization without source review."
        ),
    }


def _load_csv(path: Path, args: argparse.Namespace) -> list[dict[str, Any]]:
    facilities: list[dict[str, Any]] = []

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            lat = _parse_float(_first_value(row, ["lat", "latitude", "y"]))
            lng = _parse_float(
                _first_value(row, ["lng", "lon", "longitude", "x"])
            )
            facility = _facility_from_properties(
                row,
                lat=lat,
                lng=lng,
                source_url=args.source_url,
                source_license=args.source_license,
                country_code=args.country_code,
                country=args.country,
            )
            if facility:
                facilities.append(facility)

    return facilities


def _load_geojson(path: Path, args: argparse.Namespace) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    features = data.get("features") if isinstance(data, dict) else None
    facilities: list[dict[str, Any]] = []

    if not isinstance(features, list):
        return facilities

    for feature in features:
        if not isinstance(feature, dict):
            continue

        properties = feature.get("properties")
        geometry = feature.get("geometry")
        coordinates = geometry.get("coordinates") if isinstance(geometry, dict) else None

        if not isinstance(properties, dict) or not isinstance(coordinates, list):
            continue

        lng = _parse_float(coordinates[0] if len(coordinates) > 0 else None)
        lat = _parse_float(coordinates[1] if len(coordinates) > 1 else None)
        facility = _facility_from_properties(
            properties,
            lat=lat,
            lng=lng,
            source_url=args.source_url,
            source_license=args.source_license,
            country_code=args.country_code,
            country=args.country,
        )
        if facility:
            facilities.append(facility)

    return facilities


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize CSV or GeoJSON facility identity data."
    )
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--source-license", required=True)
    parser.add_argument("--country-code", required=True)
    parser.add_argument("--country", required=True)
    args = parser.parse_args()

    suffix = args.input.suffix.lower()
    if suffix == ".csv":
        facilities = _load_csv(args.input, args)
    elif suffix in {".json", ".geojson"}:
        facilities = _load_geojson(args.input, args)
    else:
        raise SystemExit("Input must be CSV, JSON, or GeoJSON.")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(facilities, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(facilities)} facilities to {args.output}")


if __name__ == "__main__":
    main()
