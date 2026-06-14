import type { FacilityOption, ReviewData } from "./api/cases";

const emptyText = "Not provided";
const legacyClinicalCapabilityPhrase = ["Clinical capability", "unverified"].join(
  " "
);
const legacyMamathembaMetadataPhrase = [
  "Capability metadata",
  "not verified by Mamathemba",
].join(" ");
const legacyCapabilityVerificationPhrase = [
  "capability metadata",
  "requires clinician verification",
].join(" ");

export const AFRICA_PILOT_WARNING =
  "Mamathemba Africa pilot currently supports African facility discovery only.";

export function getFacilityKey(facility: FacilityOption): string {
  return facility.facility_id || facility.facility_name;
}

export function normalizeToken(value: string): string {
  return value.replaceAll("_", " ").trim();
}

export function formatSubmittedFactValue(value: string | undefined): string {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue ? normalizeToken(trimmedValue) : emptyText;
}

export function formatCommaSeparated(value: string | undefined): string {
  const items = (value ?? "")
    .split(",")
    .map((item) => normalizeToken(item))
    .filter(Boolean);

  return items.length > 0 ? items.join(", ") : emptyText;
}

export function formatCapability(value: string): string {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "unverified" || normalizedValue === "identity_only") {
    return "Facility identity listed";
  }

  return normalizeToken(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function safeFacilityText(value: string): string {
  return value
    .replaceAll(
      "Blood support available",
      "Blood support listed for clinician verification"
    )
    .replaceAll(
      "blood support available",
      "blood support listed for clinician verification"
    )
    .replaceAll(
      "Maternal stabilization available",
      "Maternal stabilization listed for clinician verification"
    )
    .replaceAll(
      "maternal stabilization available",
      "maternal stabilization listed for clinician verification"
    )
    .replaceAll(
      "Operative capability available",
      "Operative capability listed for clinician verification"
    )
    .replaceAll(
      "operative capability available",
      "operative capability listed for clinician verification"
    )
    .replaceAll("Facility identity available", "Facility identity listed")
    .replaceAll("facility identity available", "facility identity listed")
    .replaceAll(
      legacyClinicalCapabilityPhrase,
      "Clinical services not scored"
    )
    .replaceAll(
      legacyClinicalCapabilityPhrase.toLowerCase(),
      "clinical services not scored"
    )
    .replaceAll(
      legacyMamathembaMetadataPhrase,
      "Clinical services are not scored for this option"
    )
    .replaceAll(
      `${legacyCapabilityVerificationPhrase.replace("capability", "Capability")}.`,
      "Clinician must confirm receiving capability, availability, and acceptance before transfer."
    )
    .replaceAll(
      legacyCapabilityVerificationPhrase,
      "clinician must confirm receiving capability, availability, and acceptance before transfer"
    );
}

function hasRoutedTravelTime(facility: FacilityOption): boolean {
  return (
    facility.routing_provider === "google_routes" &&
    typeof facility.estimated_travel_time_min === "number"
  );
}

function isGoogleOnlyFacility(facility: FacilityOption): boolean {
  return (
    facility.metadata_confidence === "live_google_identity" ||
    facility.metadata_confidence === "google_places_live" ||
    facility.ranking_basis === "google_route_only"
  );
}

function isSourceTrackedIdentityFacility(facility: FacilityOption): boolean {
  return (
    facility.metadata_confidence === "source_verified_identity" ||
    facility.metadata_confidence === "source_tracked_identity" ||
    facility.ranking_basis === "source_tracked_identity_route"
  );
}

export function hasCuratedClinicalMetadata(
  facility: FacilityOption
): boolean {
  return (
    facility.metadata_confidence === "reviewed_clinical_metadata" ||
    facility.metadata_confidence === "curated_clinical" ||
    facility.ranking_basis === "curated_capability_and_route"
  );
}

function hasPreciseRoute(facility: FacilityOption): boolean {
  return hasRoutedTravelTime(facility) && facility.route_accuracy === "precise";
}

function formatDistance(facility: FacilityOption): string {
  return typeof facility.distance_km === "number"
    ? `${facility.distance_km} km`
    : "";
}

export function formatTravelSummary(facility: FacilityOption): string {
  if (hasPreciseRoute(facility)) {
    const distance = formatDistance(facility);
    return `${facility.estimated_travel_time_min} min${
      distance ? ` · ${distance}` : ""
    }`;
  }

  if (hasRoutedTravelTime(facility)) {
    return "Approximate route from area center";
  }

  const distance = formatDistance(facility);
  return distance
    ? `Route time unavailable · ${distance} straight-line`
    : "Route time unavailable";
}

export function formatTravelDetail(facility: FacilityOption): string {
  if (hasPreciseRoute(facility)) {
    const distance = formatDistance(facility);
    return `Routed estimate: ${facility.estimated_travel_time_min} min${
      distance ? `, ${distance}` : ""
    }.`;
  }

  if (hasRoutedTravelTime(facility)) {
    const distance = formatDistance(facility);
    return `Approximate route from area center: ${facility.estimated_travel_time_min} min${
      distance ? `, ${distance}` : ""
    }. Enter the referring clinic or street address for more accurate routing.`;
  }

  const distance = formatDistance(facility);
  return distance
    ? `Routed travel time is unavailable. Straight-line distance: ${distance}.`
    : "Routed travel time is unavailable for this option.";
}

export function getFacilityBasisLabel(facility: FacilityOption): string {
  if (isGoogleOnlyFacility(facility)) {
    return "Live facility identity";
  }

  if (isSourceTrackedIdentityFacility(facility)) {
    return "Source-verified facility identity";
  }

  return "Reviewed clinical metadata";
}

export function getSelectedFacilityBadge(facility: FacilityOption): string {
  if (isGoogleOnlyFacility(facility)) {
    return "Live identity";
  }

  if (isSourceTrackedIdentityFacility(facility)) {
    return "Identity verified";
  }

  return "Reviewable option";
}

export function getFacilityDataBasis(facility: FacilityOption): string {
  if (isGoogleOnlyFacility(facility)) {
    return "Live facility identity from Google Places. Route estimate from Google Routes when available. Clinical services are not scored from Google data.";
  }

  if (isSourceTrackedIdentityFacility(facility)) {
    return "Source-verified facility identity and location. Clinician must confirm receiving capability, availability, and acceptance before transfer.";
  }

  return "Reviewed clinical metadata from the registry. Clinician must confirm current receiving capacity before transfer.";
}

export function getFacilityEvidenceText(facility: FacilityOption): string {
  const identitySource =
    facility.identity_verification_source || facility.source || "facility registry";

  if (hasCuratedClinicalMetadata(facility)) {
    return `Identity source: ${identitySource}. Clinical metadata reviewed${
      facility.clinical_metadata_reviewed_at
        ? ` ${facility.clinical_metadata_reviewed_at}`
        : ""
    }${
      facility.clinical_metadata_source
        ? ` from ${facility.clinical_metadata_source}`
        : ""
    }.`;
  }

  return `Identity source: ${identitySource}. Clinical services are not scored unless reviewed metadata is available.`;
}

export function formatSavedAt(value: string): string {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function getBloodPressure(reviewData: ReviewData): string {
  const { systolicBP, diastolicBP } = reviewData.submitted_facts;
  return systolicBP && diastolicBP ? `${systolicBP}/${diastolicBP}` : emptyText;
}
