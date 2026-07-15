#!/bin/sh
set -eu

export DATABASE_URL="${DATABASE_URL:-file:/app/backend/data/platform.db}"
export PORT="${PORT:-3001}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"

mkdir -p /app/backend/data

npx prisma generate
npx prisma db push

exec npm run start -- --port "${PORT}" --hostname "${HOSTNAME}"
