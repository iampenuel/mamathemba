# Mamathemba Engineering Review

## Scope

This review is for the existing Mamathemba startup repository at `/Users/admin/mamathemba`. It is written for builder-profile readiness and intentionally does not propose a new product or a rewrite. The goal is to capture what the current prototype does, where the engineering choices are strong, and what should be tightened next.

## Product Overview

Mamathemba is a clinician-facing maternal emergency referral-readiness and handoff copilot for rural and resource-constrained clinics. The product is built around a focused workflow: help a clinician prepare a referral packet from entered information, compare likely destination facilities, draft a handoff note, and review the packet before escalation.

The product boundary is narrow by design. Mamathemba is clinical support only. It is not a diagnostic system, autonomous triage tool, treatment planner, medication recommender, ambulance dispatch system, EMR, generic healthcare chatbot, or replacement for clinician judgment.

## Architecture Summary

Mamathemba is a split full-stack prototype:

- `frontend/`: Next.js, React, TypeScript, Tailwind CSS. Deployed to Vercel.
- `backend/`: FastAPI, Python, IBM watsonx SDK, local facility data, optional Google Maps integrations. Deployed to Render with `backend/Dockerfile`.
- `scripts/`: deployment readiness and public smoke-test helpers.
- `backend/data/facilities.json`: current source-tracked facility registry used by the active facility matcher.
- `backend/app/data/maternal_guidance/`: small local guidance documents used by older packet-building helper code.

The active public flow is:

```text
/ -> /new-case -> /review
```

The active backend endpoints are:

- `GET /api/health`: health check.
- `GET /api/cases/`: basic route check.
- `POST /api/cases/intake`: primary case-intake and review-packet endpoint.
- `POST /api/handoff/draft`: standalone handoff-draft endpoint.

## Core Workflow

1. The landing page presents Mamathemba as maternal emergency referral-readiness and handoff support, with explicit safety language.
2. The new-case page collects referring location, case ID, age, pregnancy status, gestational or postpartum timing, danger signs, transport mode, interventions, blood pressure, heart rate, and clinician notes.
3. The frontend submits a normalized payload to `POST /api/cases/intake`.
4. The backend normalizes danger signs and interventions, builds a referral-readiness summary, checks selected missing-information fields, generates a handoff draft through watsonx or local fallback, resolves the origin, ranks up to three facility options, and returns next-step checklist items.
5. The frontend stores the generated review packet in browser storage after removing precise coordinates.
6. The review page shows the referral summary, missing information, facility comparison, selected facility detail, editable handoff note, next-step checklist, entered-facts snapshot, save-for-review control, and clinician approval state.

## Key Technical Decisions

- The product is a workflow application, not a chat interface. The core UX is structured intake and review.
- Secrets are backend-only. The frontend uses public `NEXT_PUBLIC_*` variables, while watsonx and Google Maps credentials belong in backend env only.
- Device location is disabled by default. If enabled, coordinates are coarsened for requests and stripped before browser review storage.
- Facility matching is registry-first. Curated registry data may receive readiness scores; Google Places fallback data is treated as live identity only and is not clinically scored.
- Facility matching is optional within intake. If matching fails, the intake response can still succeed and the packet moves to manual facility verification.
- Routing supports offline straight-line distance by default, with Google Routes estimates only when `MAPS_PROVIDER=google` and the backend API key is configured.
- Safety language is repeated across the landing, intake, review, handoff prompt, facility details, and README.

## AI And Tooling Usage

The primary AI integration is IBM watsonx for drafting concise referral handoff text. The current service uses a deterministic generation configuration with greedy decoding and a short max-token budget. The handoff prompt tells the model:

- this is clinical support only
- do not diagnose
- do not recommend treatment planning
- do not present autonomous triage decisions
- base the draft only on provided information
- produce plain text with fixed section labels

If watsonx is unavailable, missing env vars, or throws during generation, the backend falls back to a deterministic local handoff draft. That fallback keeps the packet useful in local development and in degraded production states.

Google Maps APIs are optional backend-only tooling:

- Geocoding can resolve entered clinic/address origins when `MAPS_PROVIDER=google`.
- Routes can produce routed travel-time estimates.
- Places can provide nearby live facility identity when the curated registry has no nearby candidate.

The active `/api/cases/intake` route calls `watsonx_service` and `facility_matcher` directly. Older helper services such as `handoff_service`, `checklist_service`, and `guidance_service` remain in the backend and should be reviewed for consolidation so behavior does not drift.

## Healthcare Safety Boundaries

Current safety boundaries are strong and visible:

- Human review is required before escalation.
- Final clinical and referral decisions remain with the clinician.
- Facility availability, receiving capability, and acceptance must be verified before transfer.
- Google Places results are identity-only and must not be treated as clinical capability evidence.
- Facility data is source-tracked where available but is not live bed availability, live staffing, live blood supply, or live referral acceptance.
- The handoff-generation prompt explicitly forbids diagnosis, treatment planning, and autonomous triage decisions.

## Current Implementation Status

Implemented:

- Landing page with product positioning, workflow framing, and safety boundaries.
- Structured new-case form with postpartum and pregnant timing logic.
- Backend intake endpoint that returns referral summary, missing-information flags, facility options, draft handoff note, and next steps.
- Review workspace with editable handoff, facility comparison, selected facility detail, checklist, save-for-review, and approval state.
- Backend health endpoint and CORS allowlist support for local and deployed frontend origins.
- Render Dockerfile and Vercel/Render deployment notes.
- Public smoke-test script for frontend/backend reachability.
- Facility registry with 6 Gauteng, South Africa facilities and source/metadata fields.

Not implemented or only prototype-level:

- Server-side case persistence, audit trail, authentication, and user roles.
- Automated backend unit tests for intake, scoring, routing fallback, or safety behavior.
- Automated frontend or end-to-end tests for the three-page workflow.
- Production-grade facility data governance, metadata expiry handling, and receiving-facility verification.
- Real dispatch, EMR integration, secure messaging, or clinical order workflow.

## Known Risks And Unfinished Areas

- The live intake route checks only a small set of missing-information fields: transport mode, clinician notes, postpartum hours, and gestational weeks. Older `checklist_service` logic checks more fields, but that helper is not currently wired into `/api/cases/intake`.
- Facility coverage is narrow. The current registry is Gauteng-centered and contains 6 facilities.
- Offline routing returns straight-line distance only, not routed travel time.
- Google Places fallback identifies facilities but intentionally does not infer obstetric capability, blood support, operative capability, bed availability, or acceptance.
- Handoff safety relies primarily on prompt instructions and local fallback wording. There is no separate output validator that blocks diagnosis, medication, or treatment recommendations.
- The review approval state is browser-local workflow state, not a signed clinical approval or audit record.
- Browser storage is useful for prototype review but is not a production health-record storage model.
- Legacy/alternate backend services could diverge from the active route if future work edits the wrong path.
- The deployment/readiness scripts check file presence and endpoint reachability, but they do not validate the full clinical-support workflow.

## Next Engineering Milestones

1. Add backend unit tests for `/api/cases/intake`, missing-information detection, Africa boundary behavior, facility ranking, Google identity-only fallback, and watsonx fallback.
2. Consolidate duplicate packet-building logic so one checklist and one handoff workflow define active behavior.
3. Add a small API contract fixture for a postpartum severe-bleeding case and an incomplete pregnant case.
4. Add Playwright or equivalent smoke coverage for `/`, `/new-case`, and `/review`.
5. Add a lightweight safety output validator for generated handoff notes before returning them to the frontend.
6. Expand facility registry governance: source URLs, review timestamps, expiry policy, metadata confidence, and clear process for updating facility capability.
7. Define production persistence boundaries before real pilots: authentication, server-side case storage, audit logs, retention policy, and PHI handling.
8. Add CI checks for frontend lint/build, backend compile, and deployment-readiness scripts.
9. Run manual responsive QA on mobile, tablet, and desktop before any YC/Paxel demo.
