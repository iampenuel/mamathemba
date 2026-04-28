# Mamathemba

> A clinician-facing maternal emergency referral-readiness and handoff copilot for rural and resource-constrained clinics.

[Live prototype](https://mamathemba.vercel.app) · [Backend health](https://mamathemba-1.onrender.com/api/health)

Mamathemba is built around a simple product truth: in a maternal emergency, the clinician does not need an AI that tries to play doctor. She needs a system that helps reduce delay.

Picture a midwife in a rural clinic who recognizes danger signs in a woman in labor or shortly after birth. The next minutes matter. The work is not to invent a diagnosis or replace clinical judgment. The work is to prepare the referral pathway: capture the key case facts, check what is missing, compare realistic facility options, draft a handoff, and make it easier to review before sending.

That is the job of Mamathemba.

## Why This Matters

Maternal emergencies are often made worse by delay: delay in recognizing risk, delay in deciding where to refer, delay in transport, delay in handoff, and delay in receiving the right level of care.

Sub-Saharan Africa carries a disproportionate share of global maternal deaths, and rural or crisis-affected areas face some of the hardest constraints: workforce shortages, uneven facility capability, transport friction, and gaps in essential supplies. Mamathemba is designed with that reality in mind.

It is an Africa-centered healthcare workflow prototype for referral readiness, not a generic healthcare chatbot.

## What It Does

Mamathemba helps a clinician prepare a referral packet from entered information:

- structured case intake
- referral-readiness summary
- missing-information checks
- facility option comparison
- selected facility detail
- draft handoff note
- next-step checklist
- local save-for-review workflow
- clinician approval state

The current prototype supports the public flow:

```text
/ -> /new-case -> /review
```

## Product Boundaries

Mamathemba is:

- human-in-the-loop clinical support
- a maternal referral-readiness workflow product
- a handoff preparation system
- a facility comparison and referral packet tool
- a full-stack healthcare workflow application
- safety-conscious AI support for low-resource settings

Mamathemba is not:

- a diagnostic system
- autonomous triage
- treatment planning
- medication recommendation
- ambulance dispatch
- an EMR
- a generic healthcare chatbot
- a replacement for clinician judgment

Language in the product should stay inside this boundary:

- Clinical support only
- Not a diagnostic system
- Final referral decision remains with the clinician
- Review before sending
- Based on entered information
- Verify facility availability before transfer

## Who It Serves

Mamathemba is intended for workflows involving:

- midwives
- rural clinics
- district hospitals
- referral coordinators
- ambulance or transport coordination teams
- maternal-health NGOs
- mothers and newborns at vulnerable moments of care

## Architecture

This is a split full-stack prototype.

```text
frontend/   Next.js, React, Tailwind, Vercel
backend/    FastAPI, Python, Render
scripts/    readiness and smoke-test helpers
```

Core backend services include:

- handoff draft generation
- facility matching
- geocoding
- Google Places lookup when configured
- route estimation when configured
- Africa boundary handling
- local fallback behavior when live AI or map services are unavailable

Backend-only integrations:

- IBM watsonx for draft handoff support
- Google Maps APIs for geocoding, places, and routing

Secrets stay on the backend. They must never be committed, exposed in Vercel, or stored in browser state.

## Live Deployment

- Frontend: `https://mamathemba.vercel.app`
- Backend: `https://mamathemba-1.onrender.com`
- Health check: `https://mamathemba-1.onrender.com/api/health`

The backend runs on Render's free tier, so the first request after sleep may be slow.

## Local Development

Start the backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Confirm backend health:

```bash
curl http://127.0.0.1:8001/api/health
```

Start the frontend:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

Frontend variables are public:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
NEXT_PUBLIC_ENABLE_DEVICE_LOCATION=false
```

Backend variables are server-side:

```env
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=your-watsonx-project-id
WATSONX_APIKEY=your-watsonx-api-key
WATSONX_MODEL_ID=mistralai/mistral-small-3-1-24b-instruct-2503
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MAPS_PROVIDER=offline
GOOGLE_MAPS_API_KEY=
GOOGLE_PLACES_RADIUS_METERS=50000
```

Use `backend/.env.example`, `backend/.env.production.example`, `frontend/.env.example`, and `frontend/.env.production.example` as templates. Do not commit populated `.env` files.

## Deployment Notes

Current public deployment:

- Vercel frontend rooted at `frontend/`
- Render backend using `backend/Dockerfile`

Vercel production env:

```env
NEXT_PUBLIC_API_BASE_URL=https://mamathemba-1.onrender.com
NEXT_PUBLIC_ENABLE_DEVICE_LOCATION=false
```

Render `FRONTEND_ORIGINS`:

```env
http://localhost:3000,http://127.0.0.1:3000,https://mamathemba.vercel.app
```

Deployment checklists:

- [DEPLOY_NOW.md](DEPLOY_NOW.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)

## Verification

Local checks:

```bash
cd frontend
npm run lint
npm run build
cd ..
python3 -m compileall -q backend/app
sh scripts/check_deployment_readiness.sh
```

Public smoke test:

```bash
sh scripts/smoke_test_public_deploy.sh https://mamathemba.vercel.app https://mamathemba-1.onrender.com
```

## Privacy And Safety Notes

- Device location is disabled by default for the prototype.
- Clinician-entered clinic or address location is the preferred origin signal.
- Precise origin coordinates should not be persisted in browser review storage.
- Google Maps and IBM watsonx credentials stay backend-only.
- Google-only facility results should not receive clinical readiness scores.
- Facility availability must be verified before transfer.
- Final referral decisions remain with the clinician.

## Suggested GitHub About

Description:

```text
Clinician-facing maternal emergency referral-readiness and handoff copilot for rural and resource-constrained clinics.
```

Website:

```text
https://mamathemba.vercel.app
```

Topics:

```text
maternal-health clinical-support referral-readiness handoff fastapi nextjs watsonx google-maps render vercel
```
