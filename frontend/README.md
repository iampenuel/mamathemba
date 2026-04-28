# Mamathemba Frontend

Next.js frontend for Mamathemba, a clinical support prototype for maternal emergency referral readiness and handoff preparation.

The full project overview, safety framing, deployment notes, and smoke-test commands live in the root [README.md](../README.md).

## Local Development

Install dependencies and start the app:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Local `.env.local` should use:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
NEXT_PUBLIC_ENABLE_DEVICE_LOCATION=false
```

## Scripts

```bash
npm run lint
npm run build
```

## Deployment

The production frontend is deployed on Vercel from this `frontend/` directory.

Required Vercel variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://mamathemba-1.onrender.com
NEXT_PUBLIC_ENABLE_DEVICE_LOCATION=false
```

Do not add backend secrets, watsonx credentials, or Google Maps API keys to Vercel.
