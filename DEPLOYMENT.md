# Mamathemba Deployment Readiness

## Goal
Prepare Mamathemba for split deployment without changing the current local product architecture:

- `frontend/` deploys separately
- `backend/` deploys separately
- IBM watsonx credentials stay backend-only
- local development continues to use Next.js on `3000` and FastAPI on `8001`

## Phase 0: Stabilize local flow first
Before deploying anything:

1. Start the backend from `backend/`
   ```bash
   .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
   ```
2. Confirm backend health
   ```bash
   curl http://127.0.0.1:8001/api/health
   ```
3. Start the frontend from `frontend/`
   ```bash
   npm run dev
   ```
4. Confirm the local workflow:
   - `/` landing page loads
   - `/new-case` loads
   - `Continue to review` reaches `/review`
   - referral summary, facility options, handoff draft, and next steps render

## Environment variables

### Frontend
Create `frontend/.env.local` from `frontend/.env.example`.
For production, mirror `frontend/.env.production.example` in the Vercel environment settings.

Required:

- `NEXT_PUBLIC_API_BASE_URL`
  - Local: `http://127.0.0.1:8001`
  - Production: your deployed backend URL, for example `https://mamathemba-api.<region>.codeengine.appdomain.cloud`
  - Required in production. The frontend intentionally does not fall back to localhost in production builds.

### Backend
Create `backend/.env` from `backend/.env.example`.
For production, mirror `backend/.env.production.example` in IBM Cloud Code Engine secrets/environment variables.

Required:

- `WATSONX_URL`
- `WATSONX_PROJECT_ID`
- `WATSONX_APIKEY`

Optional:

- `WATSONX_MODEL_ID`
- `FRONTEND_ORIGINS`
  - Comma-separated allowlist for local plus deployed frontend origins
- `MAPS_PROVIDER`
  - Use `offline` by default, or `google` to enable backend-only Google Geocoding, Places, and Routes calls
- `GOOGLE_MAPS_API_KEY`
  - Backend secret only; enable and restrict it to Geocoding API, Places API, and Routes API
- `GOOGLE_PLACES_RADIUS_METERS`
  - Optional nearby-hospital search radius; defaults to `50000`

Rules:

- Do not place watsonx secrets in the frontend
- Do not place Google Maps API keys in the frontend
- Do not commit populated `.env` files
- Use Code Engine secrets or environment variables for production

## Backend deployment plan: IBM Cloud Code Engine

### Why this fits
- Keeps the IBM story strong: watsonx.ai plus IBM Cloud Code Engine
- Works well for a containerized FastAPI API
- Keeps secrets on the backend only

### Backend packaging in this repo
- `backend/requirements.txt` defines the Python dependencies
- `backend/Dockerfile` packages the FastAPI service
- `backend/.dockerignore` keeps secrets and local virtualenv files out of the image

### Container behavior
- Entrypoint runs `uvicorn app.main:app`
- The container honors Code Engine's `PORT` environment variable
- Health endpoint for smoke tests: `/api/health`

### Code Engine checklist
1. Build and publish the backend container image
2. Create a Code Engine app from that image
3. Set backend environment variables and secrets:
   - `WATSONX_URL`
   - `WATSONX_PROJECT_ID`
   - `WATSONX_APIKEY`
   - `WATSONX_MODEL_ID`
   - `FRONTEND_ORIGINS`
   - `MAPS_PROVIDER`
   - `GOOGLE_MAPS_API_KEY`
   - `GOOGLE_PLACES_RADIUS_METERS`
4. Deploy and confirm:
   - `GET /api/health` returns `ok`
   - `POST /api/cases/intake` returns a valid packet
5. Record the backend public URL for frontend configuration

## Frontend deployment plan: Vercel first, Cloudflare Pages second

### Preferred path now
Use Vercel first for the judged prototype because the current Next.js app is already closest to that path.

### Frontend checklist
1. Set `NEXT_PUBLIC_API_BASE_URL` to the deployed backend URL
2. Deploy the `frontend/` app
3. Smoke test:
   - landing page
   - `/new-case`
   - `/review`
   - client-to-backend POST flow

### Cloudflare Pages note
Cloudflare Pages is still a possible direction, but this repo does not yet include Cloudflare-specific Next.js adapter setup. Treat that as a later platform variant, not the current default deployment target.

## Split-deployment smoke test
After both sides are deployed:

1. Open the frontend URL
2. Start a new case
3. Submit the canonical postpartum severe-bleeding scenario
4. Confirm `/review` renders:
   - referral summary
   - missing information
   - facility options
   - handoff note
   - next steps
   - entered facts snapshot
5. Confirm browser devtools show requests going only to the backend API base URL
6. Confirm no watsonx secret appears in frontend bundles or public env

## Current truth
- The app is now locally structured for split deployment
- Backend CORS supports local origins by default and deployed origins through `FRONTEND_ORIGINS`
- Backend containerization is now prepared
- Frontend deployment env configuration is now prepared
- Production deployment itself has not been performed in this repo yet
