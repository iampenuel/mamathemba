# Mamathemba

Clinical support prototype for maternal emergency referral readiness and handoff preparation.

Mamathemba helps a clinician prepare a structured maternal emergency referral packet: entered case facts, referral-readiness summary, facility options, a draft handoff note, and next-step checklist.

Live prototype:

- Frontend: [https://mamathemba.vercel.app](https://mamathemba.vercel.app)
- Backend health: [https://mamathemba-1.onrender.com/api/health](https://mamathemba-1.onrender.com/api/health)

## Safety Framing

Mamathemba is clinical support only.

It is human-in-the-loop and is not a diagnostic system. It does not provide autonomous triage, treatment planning, dispatch, or final referral decision-making. Facility options and handoff drafts are prepared for clinician review.

Backend-only services may use IBM watsonx and Google Maps APIs when configured. API keys and model credentials must never be placed in frontend environment variables, browser storage, or committed files.

## Demo Flow

1. Open the public frontend.
2. Start a new case from `/new-case`.
3. Enter structured maternal emergency referral details.
4. Continue to `/review`.
5. Review the referral summary, facility options, handoff note, checklist, save state, and approval controls.

## Architecture

- `frontend/`: Next.js, React, Tailwind app deployed on Vercel.
- `backend/`: FastAPI service deployed on Render.
- `backend/app/services/`: handoff generation, facility matching, geocoding, places, routing, and Africa boundary helpers.
- `scripts/`: deployment readiness and public smoke-test scripts.

Current production endpoints:

- Vercel frontend: `https://mamathemba.vercel.app`
- Render backend: `https://mamathemba-1.onrender.com`
- Health endpoint: `/api/health`
- Intake endpoint: `/api/cases/intake`

## Local Development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Confirm health:

```bash
curl http://127.0.0.1:8001/api/health
```

Create `backend/.env` from `backend/.env.example` for local secrets and optional live services. Do not commit populated `.env` files.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Local frontend defaults to `http://localhost:3000` and calls the backend at `http://127.0.0.1:8001`.

## Environment Variables

Frontend variables are public by design:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
NEXT_PUBLIC_ENABLE_DEVICE_LOCATION=false
```

Backend variables stay server-side:

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

For production, set backend secrets in Render and frontend public variables in Vercel.

## Deployment

The current public prototype uses split deployment:

- Frontend: Vercel project rooted at `frontend/`.
- Backend: Render web service using `backend/Dockerfile`.

Vercel production variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://mamathemba-1.onrender.com
NEXT_PUBLIC_ENABLE_DEVICE_LOCATION=false
```

Render `FRONTEND_ORIGINS` should include:

```env
http://localhost:3000,http://127.0.0.1:3000,https://mamathemba.vercel.app
```

See [DEPLOY_NOW.md](DEPLOY_NOW.md) and [DEPLOYMENT.md](DEPLOYMENT.md) for the current deployment checklist.

## Verification

Run the local checks:

```bash
cd frontend
npm run lint
npm run build
cd ..
python3 -m compileall -q backend/app
sh scripts/check_deployment_readiness.sh
```

Run the public smoke test:

```bash
sh scripts/smoke_test_public_deploy.sh https://mamathemba.vercel.app https://mamathemba-1.onrender.com
```

## Privacy And Data Notes

- Device location is disabled by default for the prototype.
- Clinician-entered clinic or address location is preferred for facility matching.
- Precise origin coordinates should not be persisted in browser review storage.
- Google Maps and IBM watsonx credentials stay backend-only.
- Facility matching is referral-readiness support, not a final referral decision.

## GitHub About

Suggested repository metadata:

- Description: `Clinical support prototype for maternal emergency referral readiness and handoff preparation.`
- Website: `https://mamathemba.vercel.app`
- Topics: `maternal-health`, `clinical-support`, `referral-readiness`, `handoff`, `fastapi`, `nextjs`, `watsonx`, `google-maps`, `render`, `vercel`
