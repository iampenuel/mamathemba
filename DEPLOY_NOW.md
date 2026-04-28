# Mamathemba Public Prototype Deployment

Use this checklist when the local flow is stable and you need the public prototype online.

## Target URLs

- Frontend: `https://mamathemba.vercel.app`
- Backend: `https://mamathemba-1.onrender.com`
- Backend health: `https://mamathemba-1.onrender.com/api/health`

`localhost:3000` and `127.0.0.1:8001` are local development only and should not be used for the public demo.

## 1. Check Readiness

From the repo root:

```bash
sh scripts/check_deployment_readiness.sh
```

Confirm local checks before deploying:

```bash
cd frontend
npm run lint
npm run build
cd ..
python3 -m compileall -q backend/app
```

## 2. Backend On Render

Render service:

- Service name: `mamathemba-1`
- Runtime: Docker
- Docker context: `backend`
- Dockerfile path: `backend/Dockerfile`
- Health check path: `/api/health`
- Public URL: `https://mamathemba-1.onrender.com`

Required backend environment variables:

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

Keep `WATSONX_APIKEY` and `GOOGLE_MAPS_API_KEY` backend-only. Do not send those values in chat, put them directly into Render.

After saving env changes, redeploy or restart the Render service. Confirm:

```bash
curl https://mamathemba-1.onrender.com/api/health
```

Expected response includes:

```json
{"status":"ok","service":"mamathemba-backend"}
```

## 3. Frontend On Vercel

Vercel project:

- Project name: `mamathemba`
- Root directory: `frontend`
- Framework preset: Next.js
- Build command: default or `npm run build`
- Output directory: blank/default

Required Vercel environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://mamathemba-1.onrender.com
NEXT_PUBLIC_ENABLE_DEVICE_LOCATION=false
```

Do not set watsonx, Google Maps, or Render secret values in Vercel.

## 4. Public Smoke Test

Run:

```bash
sh scripts/smoke_test_public_deploy.sh https://mamathemba.vercel.app https://mamathemba-1.onrender.com
```

Then browser-test:

1. Open `https://mamathemba.vercel.app`.
2. Go to `/new-case`.
3. Enter a postpartum severe-bleeding demo case.
4. Submit to `/review`.
5. Confirm facility options, selected facility detail, draft handoff note, next-step checklist, save, and approval controls work.
6. Confirm browser network requests go to `https://mamathemba-1.onrender.com`, not localhost.

## Safety Check

- No populated `.env` files are committed.
- Frontend env only contains public `NEXT_PUBLIC_*` variables.
- IBM watsonx and Google Maps credentials stay backend-only.
- Facility output remains clinical support only and human-reviewed.
