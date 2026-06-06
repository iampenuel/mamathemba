# Mamathemba Agent Instructions

These instructions apply to the whole repository.

## Work Safely

- Inspect the relevant code, tests, configuration, and docs before editing.
- Keep changes small, reviewable, and scoped to the requested task.
- Do not rewrite the app or change the Mamathemba product identity unless the user explicitly asks.
- Do not touch `.env` files, secrets, API keys, deployment credentials, or secret-management settings.
- Never print, move, commit, copy, or infer secret values.
- Keep IBM watsonx, Google Maps, Google Places, and other private credentials backend-only.
- Do not place backend secrets in frontend code, public `NEXT_PUBLIC_*` variables, browser storage, logs, test fixtures, or docs.

## Product Boundary

Mamathemba is referral-readiness and handoff support only.

Allowed framing:

- clinician-facing referral-readiness workflow
- structured intake support
- missing-information review
- facility comparison support
- clinician-reviewed handoff drafting
- review-before-sending workflow support

Forbidden framing:

- diagnosis
- autonomous triage
- treatment planning
- medication advice
- ambulance dispatch
- clinician replacement
- final referral decision-making by the system
- claims of live bed, blood, capability, acceptance, or transport availability

Final clinical and referral decisions remain with the clinician.

## Facility And Location Safety

- Facility matching failures must be non-fatal. Intake and handoff flows should still return a reviewable packet when facility matching, routing, Google Places, or geocoding fails.
- Google Places or other live facility results require clinician verification before transfer.
- Live facility identity must not be treated as verified clinical capability, availability, acceptance, blood support, operative capability, or transport readiness.
- Do not store precise origin coordinates in browser storage. If browser review storage is used, strip or coarsen precise latitude/longitude values before persistence.

## Done Means

Every task must end with a concise checklist that states:

- files changed
- tests or checks added
- commands run
- safety or risk gap addressed
- verification steps completed or explicitly not completed
