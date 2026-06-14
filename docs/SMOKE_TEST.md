# Mamathemba Workflow Smoke Test

## Purpose

Use this smoke test to prove the real clinician-facing workflow:

```text
New Case -> Review -> facility comparison -> handoff review
```

This is workflow proof only. Do not enter real patient data, secrets, API keys,
watsonx credentials, Google Maps credentials, or deployment credentials.

Mamathemba must remain referral-readiness and handoff support only. It is not
diagnosis, autonomous triage, treatment planning, dispatch, EMR behavior,
medication advice, or clinician replacement.

## Local Smoke-Test Steps

1. Start the backend from `backend/`.

   ```bash
   .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
   ```

2. Confirm backend health.

   ```bash
   curl http://127.0.0.1:8001/api/health
   ```

   Expected: response includes `"status":"ok"`.

3. Start the frontend from `frontend/`.

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.
5. Click `Start new case` or open `http://localhost:3000/new-case`.
6. Use the synthetic postpartum severe-bleeding demo case already shown in the
   form. If the form has been edited, use synthetic values only:
   - pregnancy status: `Postpartum`
   - postpartum hours: `6`
   - danger signs: `severe_bleeding,dizziness`
   - transport mode: `ambulance`
   - blood pressure: `88/56`
   - heart rate: `122`
   - clinician notes: synthetic referral-preparation note only
7. Click `Continue to review`.
8. Confirm the browser reaches `/review`.
9. Confirm the review packet appears:
   - referral-readiness summary
   - entered facts snapshot
   - missing information panel
   - facility options or a non-fatal manual facility-selection message
   - selected facility detail when options are present
   - draft handoff note
   - next-steps checklist
   - save for review and approval controls
10. Confirm missing information appears when expected:
    - clear clinician notes and resubmit: expect `Clinician note not documented.`
    - clear postpartum hours for a postpartum case and resubmit: expect
      `Postpartum hours not documented.`
    - switch to `Pregnant`, clear gestational weeks, and resubmit: expect
      `Gestational weeks not documented.`

## Public Deployment Smoke-Test Steps

Run endpoint reachability first:

```bash
sh scripts/smoke_test_public_deploy.sh https://mamathemba.vercel.app https://mamathemba-1.onrender.com
```

Then complete the browser workflow manually:

1. Open [https://mamathemba.vercel.app](https://mamathemba.vercel.app/).
2. Confirm the landing page loads and communicates maternal referral-readiness
   and handoff support.
3. Open [https://mamathemba.vercel.app/new-case](https://mamathemba.vercel.app/new-case).
4. Submit a synthetic postpartum severe-bleeding demo case.
5. Confirm the app reaches `https://mamathemba.vercel.app/review`.
6. Confirm the review packet appears:
   - referral-readiness summary
   - missing information panel
   - facility comparison area or non-fatal no-facility fallback
   - selected facility detail when options are present
   - draft handoff note
   - next-steps checklist
   - save for review and approval controls
7. Confirm frontend network requests go to
   [https://mamathemba-1.onrender.com](https://mamathemba-1.onrender.com/),
   not localhost.
8. Confirm [https://mamathemba-1.onrender.com/api/health](https://mamathemba-1.onrender.com/api/health)
   returns a healthy backend response.

Render free-tier backends may sleep. If the first public intake request is slow,
wait for the backend to wake and retry once before marking the smoke test failed.

## Expected Pass/Fail Evidence

Pass evidence:

- Screenshot or notes showing `/new-case` loaded with a synthetic demo case.
- Screenshot or notes showing `/review` after submit.
- Review packet visibly includes referral summary, missing information, facility
  comparison or non-fatal fallback, handoff draft, checklist, and review controls.
- Browser network evidence shows production frontend calls the configured Render
  backend in public smoke testing.
- Backend health check returns `status: ok`.

Fail evidence:

- Frontend does not load.
- Backend health check does not return healthy status.
- Submit does not reach `/review`.
- Review packet is missing handoff, checklist, missing-information, or facility
  comparison/fallback areas.
- Facility lookup failure blocks the whole intake/review flow.
- Public frontend calls localhost or exposes backend secrets.
- Generated or returned copy crosses the safety boundary below.

## Safety-Boundary Checks

Confirm visible product language and returned review content stay inside:

- referral-readiness and handoff support only
- clinician-reviewed workflow support
- based on entered information
- final clinical and referral decisions remain with clinicians

Confirm visible product language and returned review content do not claim:

- diagnosis
- autonomous triage
- treatment planning
- dispatch
- medication advice
- EMR behavior
- clinician replacement
- live bed availability
- live blood availability
- confirmed receiving-facility acceptance
- confirmed transport availability

Facility comparison may show source-tracked or reviewed metadata, but the smoke
test should fail if it presents facility capability, blood, bed, acceptance, or
transport as live confirmed availability.

## Privacy Checks

- Device location is disabled by default.
- The UI should prefer clinic or address entry for the referring origin.
- Precise origin coordinates should not be stored in browser review storage.
- In production, frontend requests should go to the configured backend at
  `https://mamathemba-1.onrender.com`, not localhost.
- No watsonx or Google Maps secrets should appear in frontend bundles, browser
  storage, network request payloads, screenshots, QA notes, or logs.

## Risks Protected

This smoke test protects against:

- broken public New Case -> Review navigation
- review packet not rendering after successful intake
- missing-information warnings disappearing from the clinician review workflow
- facility matching or geocoding failures blocking handoff review
- handoff draft/review controls disappearing from the workflow
- checklist and approval controls becoming unavailable
- accidental drift into diagnosis, autonomous triage, treatment planning,
  dispatch, medication advice, EMR behavior, or clinician replacement language
- accidental live availability claims for beds, blood, facility acceptance, or
  transport
- browser storage or public frontend behavior exposing precise coordinates or
  backend-only secrets

## Dated Smoke-Test Result

- Date/time: 2026-06-14 04:36:24 UTC
- Frontend URL: https://mamathemba.vercel.app
- Backend URL: https://mamathemba-1.onrender.com
- Endpoint smoke script result: Passed - backend health returned status ok, frontend returned HTTP/2 200, and public smoke endpoints were reachable.
- Browser New Case page loaded: Passed
- Demo case submitted: Passed
- Reached /review: Passed
- Review packet appeared: Passed
- Missing information appeared if expected: Passed
- Facility comparison appeared or failed non-fatally: Passed
- Handoff draft/review area appeared: Passed
- Checklist/review controls appeared: Passed
- Production frontend used Render backend, not localhost: Not checked
- Safety-boundary language stayed within referral-readiness/handoff support: Passed
- No diagnosis/autonomous triage/treatment/dispatch/EMR/medication-advice/clinician-replacement claims observed: Passed
- No live bed/blood/acceptance/transport availability claims observed: Failed
- No secrets visible in browser/network/public frontend state: Passed
- Notes or failures: Site storage was cleared before testing. Browser reached `/review` and rendered the review packet, facility comparison, handoff note, checklist, and review controls. The complete demo case showed the missing-information panel with "No missing information flagged in the current review." Browser-observed text still included "Blood support available", "Maternal stabilization available", and "Operative capability available", so the no-live-availability-claims check failed and those unsafe phrases are not gone. Browser performance entries did not expose the intake fetch URL, so Render-vs-localhost API usage was not checked from network evidence; no localhost resources were observed. Visible page text, browser storage, and checked public frontend scripts did not show watsonx or Google Maps secrets.
