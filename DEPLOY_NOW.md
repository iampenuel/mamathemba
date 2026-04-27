# Mamathemba Public Prototype Deployment

Use this when the local flow is stable and you need a professional public link.

## Target URLs

- Frontend: Vercel, for example `https://mamathemba.vercel.app`
- Backend: IBM Cloud Code Engine, for example `https://mamathemba-api.<region>.codeengine.appdomain.cloud`

`localhost:3000` is only for local development and should not be used in the demo.

## 1. Deploy Backend To IBM Cloud Code Engine

Use `backend/` as the container build context.

Before opening the dashboards, run:

```bash
sh scripts/check_deployment_readiness.sh
```

Required production environment variables:

- `WATSONX_URL`
- `WATSONX_PROJECT_ID`
- `WATSONX_APIKEY`
- `WATSONX_MODEL_ID`
- `FRONTEND_ORIGINS`
- `MAPS_PROVIDER=google`
- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_PLACES_RADIUS_METERS=50000`

Keep `WATSONX_APIKEY` and `GOOGLE_MAPS_API_KEY` as backend-only Code Engine secrets.

Do not send these values in chat. Put them directly into IBM Cloud:

- `WATSONX_APIKEY`
- `GOOGLE_MAPS_API_KEY`
- IBM/Vercel account tokens

Safe to send back for debugging:

- the backend public URL
- whether `/api/health` returns `ok`
- the Vercel frontend URL
- screenshots or non-secret error messages

After deploy, confirm:

```bash
curl https://your-mamathemba-api-url/api/health
```

Expected response includes:

```json
{"status":"ok","service":"mamathemba-backend"}
```

## 2. Deploy Frontend To Vercel

Use `frontend/` as the Vercel project root.

Set this Vercel environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-mamathemba-api-url
NEXT_PUBLIC_ENABLE_DEVICE_LOCATION=false
```

Do not set watsonx or Google API keys in Vercel.

## 3. Final CORS Update

After Vercel gives you the frontend URL, update the backend Code Engine variable:

```env
FRONTEND_ORIGINS=https://your-mamathemba-frontend.vercel.app
```

Redeploy or restart the Code Engine app after updating the variable.

## 4. Public Smoke Test

From the Vercel URL:

1. Open `/`.
2. Click into `/new-case`.
3. Enter the canonical postpartum severe-bleeding case.
4. Submit to `/review`.
5. Confirm facility options, selected facility detail, draft handoff note, next-step checklist, save, and approval all work.
6. Confirm browser network requests go to the Code Engine backend URL, not localhost.

You can also run the non-secret endpoint smoke test:

```bash
sh scripts/smoke_test_public_deploy.sh https://your-frontend.vercel.app https://your-mamathemba-api-url
```

## Safety Check

- No populated `.env` files are committed.
- Frontend env only contains `NEXT_PUBLIC_API_BASE_URL` and non-sensitive public flags.
- IBM watsonx and Google Maps secrets stay backend-only.
- Facility output remains clinical support only and human-reviewed.
