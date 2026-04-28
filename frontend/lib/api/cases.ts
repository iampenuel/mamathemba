export const REVIEW_STORAGE_KEY = "mamathemba_review_data";
export const INTAKE_DRAFT_STORAGE_KEY = "mamathemba_intake_draft";
export const SAVED_REVIEW_STORAGE_KEY = "mamathemba_latest_saved_review";

export type SubmittedFacts = {
  caseId: string;
  referringLocation: string;
  originLat: string;
  originLng: string;
  originSource: "entered" | "device" | "fallback";
  age: string;
  pregnancyStatus: string;
  gestationalWeeks: string;
  postpartumHours: string;
  dangerSigns: string;
  transportMode: string;
  interventionsGiven: string;
  systolicBP: string;
  diastolicBP: string;
  heartRate: string;
  clinicianNotes: string;
};

export type FacilityOption = {
  facility_id?: string;
  facility_name: string;
  facility_type?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  address?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  capability_level: string;
  travel_time_band: string;
  distance_km?: number;
  estimated_travel_time_min?: number;
  map_url?: string;
  source?: string;
  source_url?: string;
  source_license?: string;
  google_place_id?: string;
  metadata_confidence?:
    | "reviewed_clinical_metadata"
    | "source_verified_identity"
    | "live_google_identity"
    | "curated_clinical"
    | "source_tracked_identity"
    | "google_places_live";
  capability_verification_level?: string;
  last_reviewed?: string;
  identity_verification_source?: string;
  identity_verified_at?: string;
  clinical_metadata_source?: string;
  clinical_metadata_reviewed_at?: string;
  clinical_metadata_reviewed_by?: string;
  clinical_metadata_expires_at?: string;
  verification_status?: string;
  data_notes?: string;
  capabilities?: string[];
  routing_provider?: string;
  route_accuracy?: "precise" | "approximate" | "unavailable";
  routing_note?: string;
  ranking_basis?:
    | "curated_capability_and_route"
    | "source_tracked_identity_route"
    | "google_route_only";
  origin_country_code?: string;
  origin_country?: string;
  origin_precision?: string;
  origin_place_types?: string[];
  origin_location_type?: string;
  rationale: string[];
  score: number;
};

export type IntakeResponse = {
  case_id: string;
  referral_readiness_summary: string;
  missing_information: string[];
  facility_options: FacilityOption[];
  draft_handoff_note: string;
  next_steps: string[];
};

export type ReviewData = IntakeResponse & {
  submitted_facts: SubmittedFacts;
};

export type ReviewWorkflowState = {
  selectedFacilityId: string | null;
  checkedNextSteps: Record<string, boolean>;
  draftHandoffNote: string;
  reviewStatus: "pending" | "approved";
  approvedAt?: string;
};

export type SavedReviewPacket = {
  reviewData: ReviewData;
  workflowState: ReviewWorkflowState;
  savedAt: string;
};

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(
  /\/+$/,
  ""
);
const API_BASE_URL =
  configuredApiBaseUrl ||
  (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:8001");
const REVIEW_DATA_CHANGED_EVENT = "mamathemba-review-data-changed";

let cachedReviewDataRaw: string | null | undefined;
let cachedReviewDataSnapshot: ReviewData | null = null;

function sanitizeSubmittedFactsForStorage(form: SubmittedFacts): SubmittedFacts {
  const referringLocation = form.referringLocation ?? "";
  const safeOriginSource =
    form.originSource === "device"
      ? "entered"
      : form.originSource || (referringLocation.trim() ? "entered" : "fallback");

  return {
    ...form,
    referringLocation,
    originLat: "",
    originLng: "",
    originSource: safeOriginSource,
  };
}

function sanitizeReviewDataForStorage(reviewData: ReviewData): ReviewData {
  return {
    ...reviewData,
    submitted_facts: sanitizeSubmittedFactsForStorage(
      reviewData.submitted_facts
    ),
  };
}

function coarsenCoordinateForRequest(value: string): number | null {
  if (!value) {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Number(numericValue.toFixed(2));
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getLegacyLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function splitCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readJsonResponse(
  response: Response
): Promise<Record<string, unknown> | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { detail: text };
  }
}

function cacheReviewDataSnapshot(
  rawReviewData: string | null,
  reviewData: ReviewData | null
): ReviewData | null {
  cachedReviewDataRaw = rawReviewData;
  cachedReviewDataSnapshot = reviewData;
  return cachedReviewDataSnapshot;
}

function readRawStoredReviewData(): string | null {
  const sessionStorage = getSessionStorage();
  const localStorage = getLegacyLocalStorage();
  const rawSessionData = sessionStorage?.getItem(REVIEW_STORAGE_KEY);

  if (rawSessionData) {
    return rawSessionData;
  }

  const rawLegacyData = localStorage?.getItem(REVIEW_STORAGE_KEY);
  if (!rawLegacyData) {
    return null;
  }

  try {
    JSON.parse(rawLegacyData);
    sessionStorage?.setItem(REVIEW_STORAGE_KEY, rawLegacyData);
    localStorage?.removeItem(REVIEW_STORAGE_KEY);
    return rawLegacyData;
  } catch {
    localStorage?.removeItem(REVIEW_STORAGE_KEY);
    return null;
  }
}

function dispatchReviewDataChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(REVIEW_DATA_CHANGED_EVENT));
}

export function storeReviewData(reviewData: ReviewData): boolean {
  const storage = getSessionStorage();

  if (!storage) {
    return false;
  }

  try {
    const sanitizedReviewData = sanitizeReviewDataForStorage(reviewData);
    const rawReviewData = JSON.stringify(sanitizedReviewData);
    storage.setItem(REVIEW_STORAGE_KEY, rawReviewData);
    cacheReviewDataSnapshot(rawReviewData, sanitizedReviewData);
    dispatchReviewDataChanged();
    return true;
  } catch {
    return false;
  }
}

export function getStoredReviewDataSnapshot(): ReviewData | null {
  const rawReviewData = readRawStoredReviewData();

  if (cachedReviewDataRaw === rawReviewData) {
    return cachedReviewDataSnapshot;
  }

  if (!rawReviewData) {
    return cacheReviewDataSnapshot(null, null);
  }

  try {
    const parsedReviewData = JSON.parse(rawReviewData) as ReviewData;
    const sanitizedReviewData = sanitizeReviewDataForStorage(parsedReviewData);
    const sanitizedRawReviewData = JSON.stringify(sanitizedReviewData);

    if (sanitizedRawReviewData !== rawReviewData) {
      getSessionStorage()?.setItem(REVIEW_STORAGE_KEY, sanitizedRawReviewData);
      getLegacyLocalStorage()?.removeItem(REVIEW_STORAGE_KEY);
      return cacheReviewDataSnapshot(
        sanitizedRawReviewData,
        sanitizedReviewData
      );
    }

    return cacheReviewDataSnapshot(
      rawReviewData,
      sanitizedReviewData
    );
  } catch {
    getSessionStorage()?.removeItem(REVIEW_STORAGE_KEY);
    getLegacyLocalStorage()?.removeItem(REVIEW_STORAGE_KEY);
    return cacheReviewDataSnapshot(null, null);
  }
}

export function readStoredReviewData(): ReviewData | null {
  return getStoredReviewDataSnapshot();
}

export function subscribeToStoredReviewData(
  listener: () => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleReviewDataChanged = () => {
    listener();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === REVIEW_STORAGE_KEY || event.key === null) {
      listener();
    }
  };

  window.addEventListener(REVIEW_DATA_CHANGED_EVENT, handleReviewDataChanged);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(
      REVIEW_DATA_CHANGED_EVENT,
      handleReviewDataChanged
    );
    window.removeEventListener("storage", handleStorage);
  };
}

export function clearStoredReviewData(): void {
  getSessionStorage()?.removeItem(REVIEW_STORAGE_KEY);
  getLegacyLocalStorage()?.removeItem(REVIEW_STORAGE_KEY);
  cacheReviewDataSnapshot(null, null);
  dispatchReviewDataChanged();
}

export function storeIntakeDraft(form: SubmittedFacts): boolean {
  const storage = getSessionStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(
      INTAKE_DRAFT_STORAGE_KEY,
      JSON.stringify(sanitizeSubmittedFactsForStorage(form))
    );
    return true;
  } catch {
    return false;
  }
}

export function readIntakeDraft(): SubmittedFacts | null {
  const storage = getSessionStorage();
  const rawDraft = storage?.getItem(INTAKE_DRAFT_STORAGE_KEY);

  if (!rawDraft) {
    return null;
  }

  try {
    const sanitizedDraft = sanitizeSubmittedFactsForStorage(
      JSON.parse(rawDraft) as SubmittedFacts
    );
    const sanitizedRawDraft = JSON.stringify(sanitizedDraft);

    if (sanitizedRawDraft !== rawDraft) {
      storage?.setItem(INTAKE_DRAFT_STORAGE_KEY, sanitizedRawDraft);
    }

    return sanitizedDraft;
  } catch {
    storage?.removeItem(INTAKE_DRAFT_STORAGE_KEY);
    return null;
  }
}

export function clearIntakeDraft(): void {
  getSessionStorage()?.removeItem(INTAKE_DRAFT_STORAGE_KEY);
}

export function saveReviewPacketForReview(
  reviewData: ReviewData,
  workflowState: ReviewWorkflowState
): boolean {
  const storage = getLegacyLocalStorage();

  if (!storage) {
    return false;
  }

  try {
    const savedPacket: SavedReviewPacket = {
      reviewData: sanitizeReviewDataForStorage(reviewData),
      workflowState,
      savedAt: new Date().toISOString(),
    };

    storage.setItem(SAVED_REVIEW_STORAGE_KEY, JSON.stringify(savedPacket));
    return true;
  } catch {
    return false;
  }
}

export function readLatestSavedReviewPacket(): SavedReviewPacket | null {
  const storage = getLegacyLocalStorage();
  const rawPacket = storage?.getItem(SAVED_REVIEW_STORAGE_KEY);

  if (!rawPacket) {
    return null;
  }

  try {
    const savedPacket = JSON.parse(rawPacket) as SavedReviewPacket;
    const sanitizedPacket = {
      ...savedPacket,
      reviewData: sanitizeReviewDataForStorage(savedPacket.reviewData),
    };
    const sanitizedRawPacket = JSON.stringify(sanitizedPacket);

    if (sanitizedRawPacket !== rawPacket) {
      storage?.setItem(SAVED_REVIEW_STORAGE_KEY, sanitizedRawPacket);
    }

    return sanitizedPacket;
  } catch {
    storage?.removeItem(SAVED_REVIEW_STORAGE_KEY);
    return null;
  }
}

export function clearLatestSavedReviewPacket(): void {
  getLegacyLocalStorage()?.removeItem(SAVED_REVIEW_STORAGE_KEY);
}

export async function submitCaseForReview(
  form: SubmittedFacts
): Promise<ReviewData> {
  if (!API_BASE_URL) {
    throw new Error(
      "Backend API URL is not configured for this deployment. Set NEXT_PUBLIC_API_BASE_URL to the deployed backend URL."
    );
  }

  const referringLocation = form.referringLocation?.trim() ?? "";
  const payload = {
    patient_id: form.caseId.trim(),
    origin_label:
      referringLocation ||
      (form.originSource === "device" ? "Current device location" : ""),
    origin_address: referringLocation,
    origin_lat:
      form.originSource === "device"
        ? coarsenCoordinateForRequest(form.originLat)
        : null,
    origin_lng:
      form.originSource === "device"
        ? coarsenCoordinateForRequest(form.originLng)
        : null,
    origin_source: form.originSource,
    age_years: form.age ? Number(form.age) : null,
    pregnancy_status: form.pregnancyStatus.trim().toLowerCase(),
    gestational_weeks:
      form.gestationalWeeks && form.pregnancyStatus.trim().toLowerCase() !== "postpartum"
        ? Number(form.gestationalWeeks)
        : null,
    postpartum_hours:
      form.postpartumHours && form.pregnancyStatus.trim().toLowerCase() === "postpartum"
        ? Number(form.postpartumHours)
        : null,
    danger_signs: splitCommaSeparated(form.dangerSigns),
    transport_mode: form.transportMode.trim().toLowerCase(),
    interventions_given: splitCommaSeparated(form.interventionsGiven),
    systolic_bp: form.systolicBP ? Number(form.systolicBP) : null,
    diastolic_bp: form.diastolicBP ? Number(form.diastolicBP) : null,
    heart_rate: form.heartRate ? Number(form.heartRate) : null,
    clinician_notes: form.clinicianNotes.trim(),
  };

  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}/api/cases/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Could not reach the backend at ${API_BASE_URL}. Confirm the deployed backend is reachable and that CORS allows this frontend origin.`
      );
    }

    throw error;
  }

  const data = await readJsonResponse(res);

  if (!res.ok) {
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "Could not reach backend or process the case."
    );
  }

  return {
    ...(data as IntakeResponse),
    submitted_facts: sanitizeSubmittedFactsForStorage(form),
  };
}
