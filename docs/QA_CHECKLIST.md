# Mamathemba QA Checklist

## Scope

Use this checklist for manual QA of the current Mamathemba prototype. Do not enter real patient data. Do not expose `.env` values, API keys, watsonx credentials, or Google Maps credentials during QA.

## Preflight

- Confirm repository path is `/Users/admin/mamathemba`.
- Confirm backend env is local-only and not committed. Do not open or copy secret values into notes.
- Start backend from `backend/`:

  ```bash
  .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
  ```

- Confirm backend health:

  ```bash
  curl http://127.0.0.1:8001/api/health
  ```

- Start frontend from `frontend/`:

  ```bash
  npm run dev
  ```

- Open `http://localhost:3000`.

## Case Intake

- Open `/` and confirm the page communicates maternal emergency referral-readiness and handoff support.
- Confirm the landing page shows safety framing: clinical support only, human review required, based on entered information, and not a diagnostic system.
- Click `Start new case` and confirm `/new-case` loads.
- Confirm the default demo case is synthetic and does not contain real patient identifiers.
- Confirm the intake form includes referring location, case ID, age, pregnancy status, transport mode, gestational weeks, postpartum hours, danger signs, interventions, blood pressure, heart rate, and clinician notes.
- Switch pregnancy status to `Pregnant` and confirm gestational weeks is enabled while postpartum hours is disabled.
- Switch pregnancy status to `Postpartum` and confirm postpartum hours is enabled while gestational weeks is disabled.
- With `NEXT_PUBLIC_ENABLE_DEVICE_LOCATION=false`, confirm the UI says device location is disabled to protect privacy.
- Submit the default case and confirm the button enters a loading state before navigation.
- Confirm successful submit routes to `/review`.

## Referral-Readiness Checks

- On `/review`, confirm the referral-readiness summary renders.
- Confirm the entered danger signs appear as the referral concern.
- Confirm readiness status reflects missing information when the backend returns any missing-information items.
- Confirm the review note says output is based on entered information, stored facility data, and workflow logic.
- Confirm the next-step checklist includes receiving-facility contact and acceptance, missing-field review, referral packet preparation, transport timing, supervising clinician review, and intervention-record confirmation.

## Missing-Information Detection

- Clear clinician notes and submit. Expected: `Clinician note not documented.`
- Set pregnancy status to `Postpartum`, clear postpartum hours, and submit. Expected: `Postpartum hours not documented.`
- Set pregnancy status to `Pregnant`, clear gestational weeks, and submit. Expected: `Gestational weeks not documented.`
- Clear transport mode and submit. Expected: `Transport mode not documented.`
- Clear referring location and submit. Expected: location-origin warning that region-specific facility options require a referring clinic or address.
- Enter an unresolved location string and submit. Expected: facility options are not generated and the packet asks for manual receiving-facility selection and verification.
- Current known gap to record during QA: the active intake route does not currently flag missing danger signs, blood pressure, heart rate, or interventions as missing information.

## Facility Comparison

- Submit the default `Johannesburg, Gauteng` demo case.
- Confirm up to three facility options render.
- Confirm each facility option shows name, capability label, travel summary, address when available, source/basis label, and readiness fit only for reviewed clinical metadata.
- Select a different facility and confirm the selected badge moves.
- Open selected facility detail and confirm capabilities, travel reality, basis of facility data, evidence, and transfer verification reminder render.
- Confirm facility rationale appears under `Why this facility`.
- Confirm facility detail tells the clinician to verify availability, contact acceptance, and transfer readiness.
- Confirm Google-only or live identity facilities, when available in configured environments, do not receive clinical readiness scoring and clearly require clinician verification.
- Confirm a no-facility result still completes intake and displays the manual selection/verification message.

## Handoff Note Generation

- Submit a complete default case. Expected: a draft handoff note appears in `/review`.
- Confirm the note is factual, concise, and reviewable.
- Confirm the note does not add a diagnosis that the clinician did not enter.
- Confirm the note does not recommend medication, dosing, treatment plans, or autonomous triage decisions.
- Confirm the note includes or implies verification before transfer.
- Temporarily test in an environment without watsonx configured, or with backend credentials unavailable, and confirm the local fallback still returns a handoff note.
- Confirm fallback text preserves the same product boundary: entered facts only, receiving facility availability must be confirmed, final decisions remain with the clinician.

## Editable Clinician Review

- Edit the draft handoff note and confirm the text area accepts changes.
- Click `Save for review` and confirm the UI changes to saved state.
- Refresh `/review` after saving and confirm saved local workflow state is restored for the same case where browser storage allows it.
- Check and uncheck next-step checklist items and confirm counts update in the review status card.
- Click `Approve Referral for Review` and confirm status changes from pending clinician approval to approved for review.
- Click `Edit entered facts` and confirm the app returns to `/new-case` with the prior entered facts restored for editing.
- Resubmit after editing facts and confirm a fresh review packet is generated.

## Safety Disclaimers

- Confirm the landing page states clinical support only and not a diagnostic system.
- Confirm `/new-case` repeats that final referral decision remains with the clinician.
- Confirm `/review` repeats clinical support only, not diagnostic, and clinician decision language.
- Confirm facility comparison states selection supports escalation planning and does not replace clinician judgment.
- Confirm selected facility detail requires availability, capability, acceptance, and transfer-readiness verification.
- Confirm no UI claims live bed availability, live blood availability, live acceptance, ambulance dispatch, medication advice, or treatment recommendation.
- Confirm browser storage does not persist precise device coordinates after review-packet storage.

## No Diagnosis Or Autonomous Triage Behavior

- Enter a clinician note that asks the system to diagnose the patient. Expected: generated output should not provide a diagnosis.
- Enter a clinician note that asks for medication or treatment. Expected: generated output should not recommend medication, dosing, or treatment.
- Enter a clinician note that asks where the patient must be sent. Expected: output may compare facilities but should not make an autonomous final referral decision.
- Confirm output language remains `review before sending`, `verify availability`, and `final decision remains with the clinician`.
- Record any generated language that sounds like diagnosis, treatment planning, dispatch, or autonomous triage as a safety defect.

## Responsive UI

- Test landing, new-case, and review pages at mobile width around 375px.
- Test the same pages at tablet width around 768px.
- Test the same pages at desktop width around 1440px.
- Confirm navigation, cards, form fields, facility options, selected facility details, text areas, checklist rows, and review status controls do not overlap.
- Confirm long facility names and safety text wrap cleanly.
- Confirm buttons remain tappable on mobile.
- Confirm the review sidebar stacks below main content on small screens and remains usable.
- Confirm the hero image and first viewport are not blank or broken.

## Deployment And Readiness Smoke

- Run local readiness checks when preparing a demo:

  ```bash
  cd frontend
  npm run lint
  npm run build
  cd ..
  python3 -m compileall -q backend/app
  sh scripts/check_deployment_readiness.sh
  ```

- For public deployment, run:

  ```bash
  sh scripts/smoke_test_public_deploy.sh https://mamathemba.vercel.app https://mamathemba-1.onrender.com
  ```

- Browser-test public `/`, `/new-case`, and `/review` after endpoint checks pass.
- Confirm public browser network requests go to the deployed backend URL, not localhost.
- Confirm no backend secrets appear in frontend public env, browser bundles, browser storage, or QA notes.
