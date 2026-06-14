#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: sh scripts/smoke_test_public_deploy.sh <frontend-url> <backend-url>"
  echo "Example: sh scripts/smoke_test_public_deploy.sh https://mamathemba.vercel.app https://mamathemba-api.example.com"
  exit 2
fi

FRONTEND_URL="${1%/}"
BACKEND_URL="${2%/}"

case "$FRONTEND_URL" in
  http://localhost*|http://127.0.0.1*|https://localhost*|https://127.0.0.1*)
    echo "Frontend URL is still local: $FRONTEND_URL"
    exit 1
    ;;
esac

case "$BACKEND_URL" in
  http://localhost*|http://127.0.0.1*|https://localhost*|https://127.0.0.1*)
    echo "Backend URL is still local: $BACKEND_URL"
    exit 1
    ;;
esac

echo "Checking backend health..."
HEALTH_RESPONSE="$(curl -fsS "$BACKEND_URL/api/health")"
echo "$HEALTH_RESPONSE"
echo "$HEALTH_RESPONSE" | grep '"status"[[:space:]]*:[[:space:]]*"ok"' >/dev/null

echo
echo "Checking frontend response..."
curl -fsSI "$FRONTEND_URL" | sed -n '1,8p'

echo
echo "Public smoke endpoints are reachable."
echo "Next step: complete the browser workflow smoke checks in docs/SMOKE_TEST.md."
echo "Verify New Case -> Review -> facility comparison -> handoff review before accepting the deployment."
