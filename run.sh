#!/usr/bin/env bash
# local chud — stop anything on the app port, then start uvicorn.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PORT="${LOCALCHUD_PORT:-${KEELHOUSE_PORT:-${BETTERCHATBOTS_PORT:-7001}}}"
HOST="${LOCALCHUD_HOST:-127.0.0.1}"

if [[ ! -f .env ]]; then
  cp .env.example .env 2>/dev/null || true
fi
if [[ -f .env ]] && grep -q 'host.docker.internal' .env 2>/dev/null; then
  sed -i '' 's|host.docker.internal|127.0.0.1|g' .env 2>/dev/null || \
    sed -i 's|host.docker.internal|127.0.0.1|g' .env
fi
if [[ -f .env ]]; then
  val="$(grep -E '^LOCALCHUD_PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d \"'\"' | tr -d ' ')"
  [[ -z "$val" ]] && val="$(grep -E '^KEELHOUSE_PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d \"'\"' | tr -d ' ')"
  [[ -n "$val" ]] && PORT="$val"
fi

export AUTO_LOGIN=true
if [[ -f .env ]] && ! grep -qE '^AUTO_LOGIN=' .env 2>/dev/null; then
  echo "AUTO_LOGIN=true" >> .env
fi

echo "local chud"
echo "   port: $PORT"

free_port() {
  local p="$1"
  local pids
  pids="$(lsof -t -iTCP:"$p" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "   stopping: $pids"
    kill $pids 2>/dev/null || true
    sleep 1
    pids="$(lsof -t -iTCP:"$p" -sTCP:LISTEN 2>/dev/null || true)"
    [[ -n "$pids" ]] && kill -9 $pids 2>/dev/null || true
  fi
}

free_port "$PORT"

if [[ ! -d .venv ]]; then
  echo "   creating venv…"
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
  python3 setup.py
fi

source .venv/bin/activate
mkdir -p data
echo "   → http://${HOST}:${PORT}"
echo ""
exec uvicorn app:app --reload --host "$HOST" --port "$PORT"
