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

# Ollama: install if missing, start serve only if API is down
OLLAMA_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH:-}"

ollama_api_ok() {
  curl -sf "${OLLAMA_URL%/}/api/tags" >/dev/null 2>&1
}

install_ollama() {
  echo "   Ollama: not found — installing…"
  if command -v brew >/dev/null 2>&1; then
    brew install ollama
  else
    curl -fsSL https://ollama.com/install.sh | sh
  fi
}

ensure_ollama() {
  if command -v ollama >/dev/null 2>&1; then
    echo "   Ollama: installed"
    return 0
  fi
  if install_ollama && command -v ollama >/dev/null 2>&1; then
    echo "   Ollama: install done"
    return 0
  fi
  echo "   Ollama: install failed — https://ollama.com/download"
  return 1
}

start_ollama_if_needed() {
  if ollama_api_ok; then
    echo "   Ollama: already running (skip serve)"
    return 0
  fi
  if ! command -v ollama >/dev/null 2>&1; then
    return 1
  fi
  echo "   Ollama: not running — starting ollama serve (background)…"
  mkdir -p data
  nohup ollama serve >>"${ROOT}/data/ollama.log" 2>&1 &
  echo "$!" > "${ROOT}/data/.ollama-serve.pid"
  local i=0
  while ! ollama_api_ok && [[ $i -lt 20 ]]; do
    sleep 1
    i=$((i + 1))
  done
  if ollama_api_ok; then
    echo "   Ollama: ready at ${OLLAMA_URL}"
  else
    echo "   Ollama: still waking up — try: ollama serve (or open Ollama.app on Mac)"
    echo "   log: ${ROOT}/data/ollama.log"
  fi
}

ensure_ollama || true
start_ollama_if_needed || true

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

if [[ -f frontend/package.json ]]; then
  if [[ ! -d frontend/node_modules ]]; then
    echo "   chat UI: installing frontend deps…"
    (cd frontend && npm install --silent) || echo "   chat UI: npm install failed — vanilla chat fallback"
  fi
  if command -v npm >/dev/null 2>&1; then
    (cd frontend && npm run build --silent) && echo "   chat UI: Motion bundle built" || echo "   chat UI: build skipped"
  fi
fi

echo "   → http://${HOST}:${PORT}"
echo ""
exec uvicorn app:app --reload --host "$HOST" --port "$PORT"
