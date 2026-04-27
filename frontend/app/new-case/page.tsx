"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";

import BrandHomeLink from "../../components/BrandHomeLink";
import {
  SubmittedFacts,
  clearIntakeDraft,
  readIntakeDraft,
  storeReviewData,
  submitCaseForReview,
} from "../../lib/api/cases";

const deviceLocationEnabled =
  process.env.NEXT_PUBLIC_ENABLE_DEVICE_LOCATION === "true";

const initialForm: SubmittedFacts = {
  caseId: "CASE-001",
  referringLocation: "Johannesburg, Gauteng",
  originLat: "",
  originLng: "",
  originSource: "entered",
  age: "27",
  pregnancyStatus: "Postpartum",
  gestationalWeeks: "",
  postpartumHours: "6",
  dangerSigns: "severe_bleeding,dizziness",
  transportMode: "ambulance",
  interventionsGiven: "uterine_massage,iv_fluids",
  systolicBP: "88",
  diastolicBP: "56",
  heartRate: "122",
  clinicianNotes:
    "Patient delivered at lower-level facility. Ongoing bleeding observed. Urgent referral preparation underway. She needs help urgently",
};

export default function NewCasePage() {
  const router = useRouter();

  const [form, setForm] = useState<SubmittedFacts>(
    () => ({ ...initialForm, ...(readIntakeDraft() ?? {}) })
  );
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const isPostpartumCase =
    form.pregnancyStatus.trim().toLowerCase() === "postpartum";

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "referringLocation") {
        next.originLat = "";
        next.originLng = "";
        next.originSource = value.trim() ? "entered" : "fallback";
        setLocationMessage("");
      }

      if (name === "pregnancyStatus") {
        if (value.toLowerCase() === "postpartum") {
          next.gestationalWeeks = "";
          if (!next.postpartumHours) next.postpartumHours = "6";
        } else {
          next.postpartumHours = "";
        }
      }

      return next;
    });
  }

  function handleUseDeviceLocation() {
    setError("");
    setLocationMessage("");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationMessage(
        "Device location is not available in this browser. You can still enter a clinic name or address."
      );
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(2);
        const lng = position.coords.longitude.toFixed(2);

        setForm((prev) => ({
          ...prev,
          referringLocation:
            prev.referringLocation.trim() || "Current device location",
          originLat: lat,
          originLng: lng,
          originSource: "device",
        }));
        setLocationMessage(
          "Approximate device location captured for this review only. Verify the referring clinic before transfer."
        );
        setLocating(false);
      },
      () => {
        setLocationMessage(
          "Could not use device location. You can still enter the clinic name or address manually."
        );
        setLocating(false);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60000,
        timeout: 10000,
      }
    );
  }

  async function handleContinueToReview() {
    setError("");
    setLoading(true);

    try {
      const reviewData = await submitCaseForReview(form);
      const didStoreReviewData = storeReviewData(reviewData);

      if (!didStoreReviewData) {
        throw new Error(
          "Could not store the review packet in this browser session."
        );
      }

      clearIntakeDraft();
      router.push("/review");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach backend or process the case."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f1eb] px-6 py-8 text-stone-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <BrandHomeLink />

        <div className="max-w-3xl space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-stone-950 sm:text-[2.8rem]">
            New case
          </h1>
          <p className="text-base leading-7 text-stone-600 sm:text-lg">
            Enter structured case details to prepare a clinician-reviewed
            referral summary, facility options, and handoff support packet.
          </p>
        </div>

        <div className="rounded-3xl border border-amber-300 bg-amber-50 px-5 py-4 text-base leading-7 text-amber-900">
          Clinical support only · Not a diagnostic system · Final referral decision
          remains with the clinician.
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-300 bg-red-50 px-5 py-4 text-base leading-7 text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-7 rounded-[1.75rem] border border-[#ead0c3] bg-[#fff6f1] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex-1">
                <Field
                  label="Address or referring clinic location"
                  hint="Enter where the patient is being referred from. Facility options use this address as the origin when it can be resolved."
                >
                  <input
                    name="referringLocation"
                    value={form.referringLocation}
                    onChange={handleChange}
                    placeholder="e.g. clinic name, street address, city, region"
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-lg outline-none"
                  />
                </Field>
              </div>

              {deviceLocationEnabled ? (
                <button
                  type="button"
                  onClick={handleUseDeviceLocation}
                  disabled={locating}
                  className="rounded-2xl border border-[#d9b4a2] bg-white px-5 py-3.5 text-sm font-semibold text-[#8f4f34] transition hover:bg-[#fffaf7] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {locating
                    ? "Getting location..."
                    : "Use approximate device location"}
                </button>
              ) : (
                <div className="rounded-2xl border border-[#ead0c3] bg-white px-5 py-3.5 text-sm font-semibold leading-6 text-[#8f4f34]">
                  Device location is disabled for this prototype to protect
                  clinician and patient privacy.
                </div>
              )}
            </div>

            <p className="mt-4 text-sm leading-6 text-[#6f574c]">
              Privacy note: clinic or address entry is preferred. Precise device
              coordinates are not stored in the browser review packet.
            </p>

            {locationMessage ? (
              <p className="mt-4 text-sm leading-6 text-[#8f4f34]">
                {locationMessage}
              </p>
            ) : null}

            {deviceLocationEnabled &&
            form.originSource === "device" &&
            form.originLat &&
            form.originLng ? (
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-500">
                Approximate device area captured for this intake only
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field label="Case ID">
              <input
                name="caseId"
                value={form.caseId}
                onChange={handleChange}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3.5 text-lg outline-none"
              />
            </Field>

            <Field label="Age">
              <input
                name="age"
                type="number"
                value={form.age}
                onChange={handleChange}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3.5 text-lg outline-none"
              />
            </Field>

            <Field label="Pregnancy status">
              <select
                name="pregnancyStatus"
                value={form.pregnancyStatus}
                onChange={handleChange}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-lg outline-none"
              >
                <option>Pregnant</option>
                <option>Postpartum</option>
              </select>
            </Field>

            <Field label="Transport mode">
              <input
                name="transportMode"
                value={form.transportMode}
                onChange={handleChange}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3.5 text-lg outline-none"
              />
            </Field>

            <Field
              label="Gestational weeks"
              hint={
                isPostpartumCase
                  ? "This case is currently marked postpartum, so gestational weeks are not used. Switch pregnancy status to Pregnant to enter gestational age."
                  : "Use gestational weeks for ongoing pregnancies."
              }
            >
              <input
                name="gestationalWeeks"
                type="number"
                value={form.gestationalWeeks}
                onChange={handleChange}
                disabled={isPostpartumCase}
                placeholder={isPostpartumCase ? "Pregnant cases only" : "e.g. 34"}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3.5 text-lg outline-none disabled:bg-stone-100"
              />
            </Field>

            <Field
              label="Postpartum hours"
              hint={
                isPostpartumCase
                  ? "Use postpartum hours for patients after delivery."
                  : "Postpartum hours become available when pregnancy status is set to Postpartum."
              }
            >
              <input
                name="postpartumHours"
                type="number"
                value={form.postpartumHours}
                onChange={handleChange}
                disabled={!isPostpartumCase}
                placeholder={
                  isPostpartumCase ? "e.g. 6" : "Postpartum cases only"
                }
                className="w-full rounded-2xl border border-stone-300 px-4 py-3.5 text-lg outline-none disabled:bg-stone-100"
              />
            </Field>
          </div>

          <div className="mt-6 space-y-6">
            <Field label="Danger signs (comma-separated)">
              <input
                name="dangerSigns"
                value={form.dangerSigns}
                onChange={handleChange}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3.5 text-lg outline-none"
              />
            </Field>

            <Field label="Interventions given (comma-separated)">
              <input
                name="interventionsGiven"
                value={form.interventionsGiven}
                onChange={handleChange}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3.5 text-lg outline-none"
              />
            </Field>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label="Systolic BP">
                <input
                  name="systolicBP"
                  type="number"
                  value={form.systolicBP}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-stone-300 px-4 py-3.5 text-lg outline-none"
                />
              </Field>

              <Field label="Diastolic BP">
                <input
                  name="diastolicBP"
                  type="number"
                  value={form.diastolicBP}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-stone-300 px-4 py-3.5 text-lg outline-none"
                />
              </Field>
            </div>

            <Field label="Heart rate">
              <input
                name="heartRate"
                type="number"
                value={form.heartRate}
                onChange={handleChange}
                className="w-full max-w-xl rounded-2xl border border-stone-300 px-4 py-3.5 text-lg outline-none"
              />
            </Field>

            <Field label="Clinician notes">
              <textarea
                name="clinicianNotes"
                value={form.clinicianNotes}
                onChange={handleChange}
                rows={5}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3.5 text-lg outline-none"
              />
            </Field>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={handleContinueToReview}
              disabled={loading}
              className="rounded-2xl bg-stone-950 px-7 py-4 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Generating review..." : "Continue to review"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-base font-medium text-stone-700">{label}</span>
      {children}
      {hint ? <p className="text-sm leading-6 text-stone-500">{hint}</p> : null}
    </label>
  );
}
