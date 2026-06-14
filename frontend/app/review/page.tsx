"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";

import BrandHomeLink from "../../components/BrandHomeLink";
import {
  FacilityOption,
  ReviewData,
  ReviewWorkflowState,
  getStoredReviewDataSnapshot,
  readLatestSavedReviewPacket,
  saveReviewPacketForReview,
  storeIntakeDraft,
  subscribeToStoredReviewData,
} from "../../lib/api/cases";

type ReviewStatus = "pending" | "approved";
type SaveStatus = "idle" | "saved" | "error";
type WorkspaceState = ReviewWorkflowState & {
  saveStatus: SaveStatus;
  lastSavedAt: string;
};

const emptyText = "Not provided";
const africaPilotWarning =
  "Mamathemba Africa pilot currently supports African facility discovery only.";
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

function getReviewPacketServerSnapshot(): ReviewData | null | undefined {
  return undefined;
}

function getFacilityKey(facility: FacilityOption): string {
  return facility.facility_id || facility.facility_name;
}

function normalizeToken(value: string): string {
  return value.replaceAll("_", " ").trim();
}

function formatSubmittedFactValue(value: string | undefined): string {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue ? normalizeToken(trimmedValue) : emptyText;
}

function formatCommaSeparated(value: string | undefined): string {
  const items = (value ?? "")
    .split(",")
    .map((item) => normalizeToken(item))
    .filter(Boolean);

  return items.length > 0 ? items.join(", ") : emptyText;
}

function formatCapability(value: string): string {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "unverified" || normalizedValue === "identity_only") {
    return "Facility identity listed";
  }

  return normalizeToken(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeFacilityText(value: string): string {
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

function hasCuratedClinicalMetadata(facility: FacilityOption): boolean {
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

function formatTravelSummary(facility: FacilityOption): string {
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

function formatTravelDetail(facility: FacilityOption): string {
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

function getFacilityBasisLabel(facility: FacilityOption): string {
  if (isGoogleOnlyFacility(facility)) {
    return "Live facility identity";
  }

  if (isSourceTrackedIdentityFacility(facility)) {
    return "Source-verified facility identity";
  }

  return "Reviewed clinical metadata";
}

function getSelectedFacilityBadge(facility: FacilityOption): string {
  if (isGoogleOnlyFacility(facility)) {
    return "Live identity";
  }

  if (isSourceTrackedIdentityFacility(facility)) {
    return "Identity verified";
  }

  return "Reviewable option";
}

function getFacilityDataBasis(facility: FacilityOption): string {
  if (isGoogleOnlyFacility(facility)) {
    return "Live facility identity from Google Places. Route estimate from Google Routes when available. Clinical services are not scored from Google data.";
  }

  if (isSourceTrackedIdentityFacility(facility)) {
    return "Source-verified facility identity and location. Clinician must confirm receiving capability, availability, and acceptance before transfer.";
  }

  return "Reviewed clinical metadata from the registry. Clinician must confirm current receiving capacity before transfer.";
}

function getFacilityEvidenceText(facility: FacilityOption): string {
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

function formatSavedAt(value: string): string {
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

function getBloodPressure(reviewData: ReviewData): string {
  const { systolicBP, diastolicBP } = reviewData.submitted_facts;
  return systolicBP && diastolicBP ? `${systolicBP}/${diastolicBP}` : emptyText;
}

function buildWorkflowState(
  selectedFacilityId: string | null,
  checkedNextSteps: Record<string, boolean>,
  draftHandoffNote: string,
  reviewStatus: ReviewStatus,
  approvedAt?: string
): ReviewWorkflowState {
  return {
    selectedFacilityId,
    checkedNextSteps,
    draftHandoffNote,
    reviewStatus,
    approvedAt,
  };
}

function getInitialWorkspaceState(reviewData: ReviewData): WorkspaceState {
  const savedPacket = readLatestSavedReviewPacket();
  const savedWorkflow =
    savedPacket?.reviewData.case_id === reviewData.case_id
      ? savedPacket.workflowState
      : null;
  const firstFacilityId = reviewData.facility_options[0]
    ? getFacilityKey(reviewData.facility_options[0])
    : null;
  const savedFacilityId = savedWorkflow?.selectedFacilityId ?? null;
  const savedFacilityStillExists = reviewData.facility_options.some(
    (facility) => getFacilityKey(facility) === savedFacilityId
  );

  return {
    selectedFacilityId: savedFacilityStillExists
      ? savedFacilityId
      : firstFacilityId,
    checkedNextSteps: savedWorkflow?.checkedNextSteps ?? {},
    draftHandoffNote:
      savedWorkflow?.draftHandoffNote || reviewData.draft_handoff_note,
    reviewStatus: savedWorkflow?.reviewStatus ?? "pending",
    approvedAt: savedWorkflow?.approvedAt,
    saveStatus: savedWorkflow ? "saved" : "idle",
    lastSavedAt: savedWorkflow ? savedPacket?.savedAt ?? "" : "",
  };
}

function markWorkspaceUnsaved(state: WorkspaceState): WorkspaceState {
  return state.saveStatus === "saved"
    ? {
        ...state,
        saveStatus: "idle",
      }
    : state;
}

export default function ReviewPage() {
  const reviewData = useSyncExternalStore(
    subscribeToStoredReviewData,
    getStoredReviewDataSnapshot,
    getReviewPacketServerSnapshot
  );

  if (reviewData === undefined) {
    return (
      <PageShell>
        <EmptyPanel title="Loading the latest review packet...">
          Preparing the clinician review workspace from the current browser
          session.
        </EmptyPanel>
      </PageShell>
    );
  }

  if (reviewData === null) {
    return (
      <PageShell>
        <EmptyPanel title="No review packet is available yet.">
          Start from the intake form to generate a fresh clinician review packet.
          If you completed a case in an earlier browser session, the temporary
          review data may no longer be available.
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/new-case"
              className="rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Go to new case
            </Link>
            <Link
              href="/"
              className="rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              Back to landing page
            </Link>
          </div>
        </EmptyPanel>
      </PageShell>
    );
  }

  return <ReviewWorkspace key={reviewData.case_id} reviewData={reviewData} />;
}

function ReviewWorkspace({ reviewData }: { reviewData: ReviewData }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceState>(() =>
    getInitialWorkspaceState(reviewData)
  );
  const selectedFacility =
    reviewData.facility_options.find(
      (facility) => getFacilityKey(facility) === workspace.selectedFacilityId
    ) ?? reviewData.facility_options[0];
  const completedNextSteps = reviewData.next_steps.filter(
    (step) => workspace.checkedNextSteps[step]
  ).length;
  const readinessStatus =
    reviewData.missing_information.length > 0
      ? "Needs clinician review before approval"
      : "Reviewable for clinician approval";
  const africaBoundaryMessage = reviewData.missing_information.find((item) =>
    item.includes(africaPilotWarning)
  );
  const concernText = formatCommaSeparated(
    reviewData.submitted_facts.dangerSigns
  );
  const editedReviewData: ReviewData = {
    ...reviewData,
    draft_handoff_note: workspace.draftHandoffNote,
  };

  function handleEditFacts() {
    storeIntakeDraft(reviewData.submitted_facts);
    router.push("/new-case");
  }

  function handleSaveForReview() {
    const didSave = saveReviewPacketForReview(
      editedReviewData,
      buildWorkflowState(
        selectedFacility ? getFacilityKey(selectedFacility) : null,
        workspace.checkedNextSteps,
        workspace.draftHandoffNote,
        workspace.reviewStatus,
        workspace.approvedAt
      )
    );

    setWorkspace((current) => ({
      ...current,
      saveStatus: didSave ? "saved" : "error",
      lastSavedAt: didSave ? new Date().toISOString() : current.lastSavedAt,
    }));
  }

  function handleApproveForReview() {
    const timestamp = new Date().toISOString();
    setWorkspace((current) => ({
      ...current,
      reviewStatus: "approved",
      approvedAt: timestamp,
      saveStatus: "idle",
    }));
  }

  return (
    <main className="min-h-screen bg-[#f5f1eb] text-stone-900">
      <header className="border-b border-stone-200/80 bg-[#fbfaf7] px-6 py-7">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <BrandHomeLink />
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-stone-950 sm:text-[2.7rem]">
                Referral review
              </h1>
              <p className="mt-2 text-lg leading-7 text-stone-600">
                Review before sending. Based on entered information.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleEditFacts}
              className="rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
            >
              Edit entered facts
            </button>
            <button
              type="button"
              onClick={handleSaveForReview}
              className="rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
            >
              {workspace.saveStatus === "saved"
                ? "Saved for review"
                : "Save for review"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-6 py-7">
        <div className="rounded-3xl border border-amber-300 bg-amber-50/70 px-6 py-4 text-base font-medium leading-7 text-amber-900">
          Clinical support only · Not a diagnostic system · Final referral
          decision remains with the clinician.
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-7">
            <DashboardCard
              eyebrow="Referral readiness summary"
              title="Structured review"
              action={
                <span className="rounded-full border border-[#ead0c3] bg-[#fbefe8] px-4 py-2 text-sm font-semibold text-[#8f4f34]">
                  Human review required
                </span>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <SummaryTile label="Referral concern">{concernText}</SummaryTile>
                <SummaryTile label="Readiness status">
                  {readinessStatus}
                </SummaryTile>
                <SummaryTile label="Missing critical details">
                  {reviewData.missing_information.length > 0
                    ? reviewData.missing_information.join(" ")
                    : "No critical details flagged by the current workflow check."}
                </SummaryTile>
                <SummaryTile label="Review note">
                  Based on entered information, stored facility data, and
                  workflow logic. Human review required before sending.
                </SummaryTile>
              </div>
            </DashboardCard>

            <DashboardCard
              eyebrow="Facility options"
              title="Compare likely destination facilities"
              action={
                <p className="max-w-sm text-right text-sm leading-6 text-stone-500">
                  Selection should support escalation planning, not replace
                  clinician judgment. For accurate routing, enter the referring
                  clinic or street address, not just a city. Facility metadata
                  is source-tracked where available. Clinician must verify
                  receiving capability before transfer.
                </p>
              }
            >
              {reviewData.facility_options.length > 0 ? (
                <div className="space-y-4">
                  {reviewData.facility_options.map((facility) => {
                    const facilityId = getFacilityKey(facility);
                    const isSelected = facilityId === workspace.selectedFacilityId;

                    return (
                      <button
                        key={facilityId}
                        type="button"
                        onClick={() => {
                          setWorkspace((current) =>
                            markWorkspaceUnsaved({
                              ...current,
                              selectedFacilityId: facilityId,
                            })
                          );
                        }}
                        className={`w-full rounded-[1.35rem] border p-5 text-left transition ${
                          isSelected
                            ? "border-[#c97952] bg-[#fff3ed] shadow-sm"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        }`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-2xl font-semibold tracking-tight text-stone-950">
                              {facility.facility_name}
                            </h3>
                            <p className="mt-2 text-base leading-7 text-stone-600">
                              {formatCapability(facility.capability_level)} ·{" "}
                              {formatTravelSummary(facility)}
                            </p>
                            {facility.address ? (
                              <p className="mt-1 text-sm leading-6 text-stone-500">
                                {facility.address}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                            {isSelected ? (
                              <span className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
                                Selected
                              </span>
                            ) : null}
                            <span className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700">
                              {getFacilityBasisLabel(facility)}
                            </span>
                            {hasCuratedClinicalMetadata(facility) ? (
                              <span className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700">
                                Readiness fit {facility.score}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-stone-300 bg-stone-50 px-5 py-5 text-base leading-7 text-stone-600">
                  {africaBoundaryMessage ??
                    "No facility options are available for the entered region in the current registry."}{" "}
                  Intake still completed successfully, but this packet needs
                  manual receiving-facility selection and verification.
                </div>
              )}
            </DashboardCard>

            <DashboardCard
              eyebrow="Selected facility detail"
              title={selectedFacility?.facility_name ?? "No facility selected"}
              action={
                selectedFacility ? (
                  <span className="rounded-full border border-[#ead0c3] bg-[#fbefe8] px-4 py-2 text-sm font-semibold text-[#8f4f34]">
                    {getSelectedFacilityBadge(selectedFacility)}
                  </span>
                ) : null
              }
            >
              {selectedFacility ? (
                <SelectedFacilityDetail facility={selectedFacility} />
              ) : (
                <p className="text-base leading-7 text-stone-600">
                  Choose a facility option above to review its routing and
                  verification details.
                </p>
              )}
            </DashboardCard>

            <DashboardCard
              eyebrow="Draft handoff note"
              title="Reviewable referral packet"
              action={
                <span className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-600">
                  Editable
                </span>
              }
            >
              <textarea
                value={workspace.draftHandoffNote}
                onChange={(event) => {
                  setWorkspace((current) =>
                    markWorkspaceUnsaved({
                      ...current,
                      draftHandoffNote: event.target.value,
                    })
                  );
                }}
                className="min-h-80 w-full rounded-[1.35rem] border border-stone-200 bg-white px-5 py-5 text-base leading-8 text-stone-800 outline-none transition focus:border-stone-400"
              />
              <p className="mt-4 text-sm leading-6 text-stone-500">
                Review before sending. Keep entered facts and recorded
                interventions accurate.
              </p>
            </DashboardCard>

            <DashboardCard
              eyebrow="Next steps checklist"
              title="Referral-readiness actions"
            >
              <div className="space-y-4">
                {reviewData.next_steps.map((step) => (
                  <label
                    key={step}
                    className="flex cursor-pointer items-center gap-4 rounded-[1.25rem] border border-stone-200 bg-white px-5 py-5 text-base font-medium text-stone-700 transition hover:border-stone-300"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(workspace.checkedNextSteps[step])}
                      onChange={(event) => {
                        setWorkspace((current) =>
                          markWorkspaceUnsaved({
                            ...current,
                            checkedNextSteps: {
                              ...current.checkedNextSteps,
                              [step]: event.target.checked,
                            },
                          })
                        );
                      }}
                      className="h-5 w-5 rounded border-stone-300 accent-stone-950"
                    />
                    <span>{step}</span>
                  </label>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard eyebrow="Basis / verification" title="Review basis">
              <div className="grid gap-4 md:grid-cols-2">
                <SummaryTile label="Basis of output">
                  Based on entered information, stored facility data, and
                  workflow language prepared for clinician review. Facility
                  metadata is source-tracked where available.
                </SummaryTile>
                <SummaryTile label="Verification reminders">
                  Verify facility availability, contact acceptance, transport
                  timing, and human review before sending.
                </SummaryTile>
              </div>
            </DashboardCard>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <SideCard eyebrow="Entered facts snapshot">
              <FactRow label="Case ID" value={reviewData.submitted_facts.caseId} />
              <FactRow
                label="Referring location"
                value={formatSubmittedFactValue(
                  reviewData.submitted_facts.referringLocation
                )}
              />
              <FactRow
                label="Pregnancy status"
                value={formatSubmittedFactValue(
                  reviewData.submitted_facts.pregnancyStatus
                )}
              />
              <FactRow label="Age" value={reviewData.submitted_facts.age} />
              <FactRow label="Danger signs" value={concernText} />
              <FactRow
                label="Transport mode"
                value={formatSubmittedFactValue(
                  reviewData.submitted_facts.transportMode
                )}
              />
              <FactRow label="Blood pressure" value={getBloodPressure(reviewData)} />
              <FactRow
                label="Heart rate"
                value={formatSubmittedFactValue(
                  reviewData.submitted_facts.heartRate
                )}
              />
            </SideCard>

            <SideCard eyebrow="Missing information" tone="warm">
              {reviewData.missing_information.length > 0 ? (
                <ul className="space-y-2 text-base leading-7 text-amber-950">
                  {reviewData.missing_information.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-base leading-7 text-amber-950">
                  No missing information flagged in the current review.
                </p>
              )}
            </SideCard>

            <SideCard eyebrow="Review status">
              <div className="rounded-[1.25rem] border border-stone-200 bg-white px-5 py-5">
                <p className="text-lg font-semibold text-stone-950">
                  {workspace.reviewStatus === "approved"
                    ? "Approved for review"
                    : "Pending clinician approval"}
                </p>
                <p className="mt-3 text-base leading-7 text-stone-600">
                  {workspace.reviewStatus === "approved"
                    ? "Clinician review has been marked on this browser packet."
                    : "Review before sending. Verify facility availability before transfer."}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleApproveForReview}
                  className="w-full rounded-2xl bg-stone-950 px-5 py-4 text-base font-semibold text-white transition hover:opacity-90"
                >
                  Approve Referral for Review
                </button>
                <button
                  type="button"
                  onClick={handleSaveForReview}
                  className="w-full rounded-2xl border border-stone-300 bg-white px-5 py-4 text-base font-semibold text-stone-700 transition hover:bg-stone-50"
                >
                  Save for Review
                </button>
              </div>

              <p className="mt-5 text-sm leading-6 text-stone-500">
                {workspace.saveStatus === "saved"
                  ? `Saved locally${
                      formatSavedAt(workspace.lastSavedAt)
                        ? ` at ${formatSavedAt(workspace.lastSavedAt)}`
                        : ""
                    }.`
                  : workspace.saveStatus === "error"
                    ? "Could not save this packet in local browser storage."
                    : `${completedNextSteps}/${reviewData.next_steps.length} actions checked. Human review required before sending.`}
              </p>
            </SideCard>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SelectedFacilityDetail({ facility }: { facility: FacilityOption }) {
  return (
    <div className="space-y-5">
      <p className="text-lg leading-8 text-stone-600">
        {formatCapability(facility.capability_level)} ·{" "}
        {formatTravelSummary(facility)}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="Capabilities">
          {(facility.capabilities?.length
            ? facility.capabilities
            : facility.rationale
          )
            .map(safeFacilityText)
            .join(". ")}
        </SummaryTile>
        <SummaryTile label="Travel reality">
          {formatTravelDetail(facility)}
        </SummaryTile>
        <SummaryTile label="Basis of facility data">
          {getFacilityDataBasis(facility)}
        </SummaryTile>
        <SummaryTile label="Evidence">
          {getFacilityEvidenceText(facility)}
        </SummaryTile>
        <SummaryTile label="Verify before transfer">
          Verify availability, contact acceptance, and transfer readiness
          {facility.phone ? ` via ${facility.phone}` : ""}.
        </SummaryTile>
      </div>

      <div className="rounded-[1.35rem] border border-[#ead0c3] bg-[#fff6f1] px-5 py-5">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8f4f34]">
          Why this facility
        </p>
        <ul className="mt-4 space-y-3 text-base leading-7 text-[#6f574c]">
          {facility.rationale.map((reason) => (
            <li key={reason}>• {safeFacilityText(reason)}</li>
          ))}
        </ul>
        <p className="mt-5 text-sm leading-6 text-[#6f574c]">
          {safeFacilityText(
            facility.verification_status ??
              "Clinician must confirm receiving capability, availability, and acceptance before transfer."
          )}
        </p>
        {facility.metadata_confidence ? (
          <p className="mt-3 text-sm leading-6 text-[#6f574c]">
            Metadata tier: {normalizeToken(facility.metadata_confidence)}.
            {facility.last_reviewed
              ? ` Last reviewed: ${facility.last_reviewed}.`
              : ""}
          </p>
        ) : null}
        {facility.map_url ? (
          <a
            href={facility.map_url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-2xl border border-[#d9b4a2] bg-white px-4 py-2 text-sm font-semibold text-[#8f4f34] transition hover:bg-[#fff6f1]"
          >
            Get directions
          </a>
        ) : null}
      </div>
    </div>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f1eb] px-6 py-8 text-stone-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <BrandHomeLink />
        {children}
      </div>
    </main>
  );
}

function EmptyPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white px-6 py-10 text-center shadow-sm">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
        {title}
      </h1>
      <div className="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-600">
        {children}
      </div>
    </section>
  );
}

function DashboardCard({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white px-6 py-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.32em] text-stone-500">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
            {title}
          </h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function SummaryTile({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-stone-200 bg-white px-5 py-5">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-stone-500">
        {label}
      </p>
      <div className="mt-3 text-base font-medium leading-7 text-stone-700">
        {children}
      </div>
    </div>
  );
}

function SideCard({
  eyebrow,
  tone = "cool",
  children,
}: {
  eyebrow: string;
  tone?: "cool" | "warm";
  children: ReactNode;
}) {
  const toneClasses =
    tone === "warm"
      ? "border-amber-200 bg-amber-50/60"
      : "border-[#ead0c3] bg-[#fff6f1]";

  return (
    <section className={`rounded-[2rem] border px-6 py-6 shadow-sm ${toneClasses}`}>
      <p className="text-sm font-bold uppercase tracking-[0.32em] text-[#8f4f34]">
        {eyebrow}
      </p>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 text-base leading-7">
      <span className="text-stone-600">{label}</span>
      <span className="max-w-44 text-right font-semibold text-stone-950">
        {value || emptyText}
      </span>
    </div>
  );
}
