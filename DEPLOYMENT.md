# Mamathemba Deployment Readiness

## Goal

Keep Mamathemba deployable as a split public prototype:

- `frontend/` deploys to Vercel.
- `backend/` deploys to Render.
- IBM watsonx and Google Maps credentials stay backend-only.
- Local development continues to use Next.js on `3000` and FastAPI on `8001`.

## Local Stability Check

Before deploying:

1. Start the backend from `backend/`.

   ```bash
   .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
   ```

2. Confirm backend health.

   ```bash
   curl http://127.0.0.1:8001/api/health
   ```

3. Start the frontend from `frontend/`.

   ```bash
   npm run dev
   ```

4. Confirm the local workflow:
   - `/` landing page loads.
   - `/new-case` loads.
   - `Continue to review` reaches `/review`.
   - Referral summary, facility options, handoff draft, checklist, save, and approval controls render.

## Environment Variables

### Frontend

Create `frontend/.env.local` from `frontend/.env.example`.
For production, mirror `frontend/.env.production.example` in Vercel.

Required:

- `NEXT_PUBLIC_API_BASE_URL`
  - Local: `http://127.0.0.1:8001`
  - Production: `https://mamathemba-1.onrender.com`
- `NEXT_PUBLIC_ENABLE_DEVICE_LOCATION`
  - Default: `false`

Frontend variables are public. Do not place watsonx or Google Maps secrets in the frontend.

### Backend

Create `backend/.env` from `backend/.env.example`.
For production, mirror `backend/.env.production.example` in Render.

Required:

- `WATSONX_URL`
- `WATSONX_PROJECT_ID`
- `WATSONX_APIKEY`

Optional:

- `WATSONX_MODEL_ID`
- `FRONTEND_ORIGINS`
  - Comma-separated allowlist for local plus deployed frontend origins.
- `MAPS_PROVIDER`
  - Use `offline` by default, or `google` to enable backend-only Google Geocoding, Places, and Routes calls.
- `GOOGLE_MAPS_API_KEY`
  - Backend secret only; restrict it to the required Google APIs.
- `GOOGLE_PLACES_RADIUS_METERS`
  - Optional nearby-hospital search radius; defaults to `50000`.

Rules:

- Do not commit populated `.env` files.
- Do not paste API keys in chat.
- Store backend secrets only in Render or local `backend/.env`.

## Backend Deployment: Render

Render service settings:

- Service type: Web Service
- Runtime: Docker
- Docker context: `backend`
- Dockerfile path: `backend/Dockerfile`
- Health check path: `/api/health`
- Public URL: `https://mamathemba-1.onrender.com`

Set production environment variables in Render:

```env
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=your-watsonx-project-id
WATSONX_APIKEY=store-as-render-secret
WATSONX_MODEL_ID=mistralai/mistral-small-3-1-24b-instruct-2503
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://mamathemba.vercel.app
MAPS_PROVIDER=google
GOOGLE_MAPS_API_KEY=store-as-render-secret
GOOGLE_GEOCODING_REGION=
GOOGLE_PLACES_RADIUS_METERS=50000
```

After env changes, redeploy or restart Render. Free-tier services may sleep, so the first request can be slow.

Confirm:

```bash
curl https://mamathemba-1.onrender.com/api/health
```

## Frontend Deployment: Vercel

Vercel project settings:

- Project name: `mamathemba`
- Root directory: `frontend`
- Framework preset: Next.js
- Build command: default or `npm run build`
- Output directory: blank/default

Set production environment variables in Vercel:

```env
NEXT_PUBLIC_API_BASE_URL=https://mamathemba-1.onrender.com
NEXT_PUBLIC_ENABLE_DEVICE_LOCATION=false
```

The committed `frontend/vercel.json` pins the Vercel framework to Next.js.

## Split-Deployment Smoke Test

After both sides are deployed:

```bash
sh scripts/smoke_test_public_deploy.sh https://mamathemba.vercel.app https://mamathemba-1.onrender.com
```

Then manually confirm:

1. Open the frontend URL.
2. Start a new case.
3. Submit a postpartum severe-bleeding demo case.
4. Confirm `/review` renders:
   - referral summary
   - missing information
   - facility options
   - handoff note
   - next steps
   - entered facts snapshot
5. Confirm browser requests go only to the deployed backend API base URL.
6. Confirm no watsonx or Google Maps secret appears in frontend bundles, public env, or browser storage.

## Current Truth

- The public frontend is live on Vercel.
- The public backend is live on Render.
- Backend CORS supports local origins by default and deployed origins through `FRONTEND_ORIGINS`.
- Production frontend env points to the Render backend.
- Backend secrets remain backend-only.
