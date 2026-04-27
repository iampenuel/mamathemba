#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

echo "Mamathemba deployment readiness"
echo

missing=0

check_file() {
  if [ -f "$ROOT_DIR/$1" ]; then
    echo "ok  $1"
  else
    echo "no  $1"
    missing=1
  fi
}

check_file "backend/Dockerfile"
check_file "backend/.dockerignore"
check_file "backend/requirements.txt"
check_file "backend/.env.production.example"
check_file "frontend/package.json"
check_file "frontend/.env.production.example"
check_file "DEPLOY_NOW.md"

echo

if command -v ibmcloud >/dev/null 2>&1; then
  echo "ok  ibmcloud CLI installed"
else
  echo "info ibmcloud CLI not installed; use IBM Cloud dashboard or install CLI"
fi

if command -v vercel >/dev/null 2>&1; then
  echo "ok  Vercel CLI installed"
else
  echo "info Vercel CLI not installed; use Vercel dashboard or install CLI"
fi

if command -v docker >/dev/null 2>&1; then
  echo "ok  Docker installed"
else
  echo "info Docker not installed; Code Engine can still build from source/Git"
fi

echo

if [ "$missing" -eq 0 ]; then
  echo "Ready for dashboard deployment. Follow DEPLOY_NOW.md."
else
  echo "Missing required deployment files."
  exit 1
fi
