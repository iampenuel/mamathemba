from typing import Any


AFRICA_ONLY_WARNING = (
    "Mamathemba Africa pilot currently supports African facility discovery only."
)
UNKNOWN_COUNTRY_WARNING = (
    "Location country could not be confirmed for Africa-only facility discovery."
)

AFRICAN_COUNTRY_CODES = {
    "AO",
    "BF",
    "BI",
    "BJ",
    "BW",
    "CD",
    "CF",
    "CG",
    "CI",
    "CM",
    "CV",
    "DJ",
    "DZ",
    "EG",
    "ER",
    "ET",
    "GA",
    "GH",
    "GM",
    "GN",
    "GQ",
    "GW",
    "KE",
    "KM",
    "LR",
    "LS",
    "LY",
    "MA",
    "MG",
    "ML",
    "MR",
    "MU",
    "MW",
    "MZ",
    "NA",
    "NE",
    "NG",
    "RW",
    "SC",
    "SD",
    "SL",
    "SN",
    "SO",
    "SS",
    "ST",
    "SZ",
    "TD",
    "TG",
    "TN",
    "TZ",
    "UG",
    "ZA",
    "ZM",
    "ZW",
}


def normalize_country_code(value: Any) -> str:
    return str(value or "").strip().upper()


def is_african_country_code(value: Any) -> bool:
    return normalize_country_code(value) in AFRICAN_COUNTRY_CODES


def facility_discovery_warning(origin: dict[str, Any]) -> str | None:
    country_code = normalize_country_code(origin.get("country_code"))

    if country_code:
        return None if is_african_country_code(country_code) else AFRICA_ONLY_WARNING

    if origin.get("status") == "resolved":
        return UNKNOWN_COUNTRY_WARNING

    return None
