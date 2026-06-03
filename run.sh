#!/usr/bin/env bash
# local chud  stop anything on the app port, then start uvicorn.
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
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2}"
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH:-}"
ollama_api_ok() {
  curl -sf "${OLLAMA_URL%/}/api/tags" >/dev/null 2>&1
}
install_ollama() {
  echo "   Ollama: not found  installing"
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
  echo "   Ollama: install failed  https://ollama.com/download"
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
  echo "   Ollama: not running  starting ollama serve (background)"
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
    echo "   Ollama: still waking up  try: ollama serve (or open Ollama.app on Mac)"
    echo "   log: ${ROOT}/data/ollama.log"
  fi
}
ensure_model_pulled() {
  local model="$1"
  if ! command -v ollama >/dev/null 2>&1; then
    echo "   model pull: ollama not available  skipping"
    return 1
  fi
  if ! ollama_api_ok; then
    echo "   model pull: Ollama API not reachable  skipping pull of ${model}"
    return 1
  fi
  # Check if model is already present via the API tags list
  if curl -sf "${OLLAMA_URL%/}/api/tags" 2>/dev/null \
      | grep -q "\"${model}"; then
    echo "   model: ${model} already pulled"
    return 0
  fi
  echo "   model: ${model} not found  pulling (this may take a while)"
  if ollama pull "${model}"; then
    echo "   model: ${model} ready"
  else
    echo "   model: pull failed for ${model}  you can retry with: ollama pull ${model}"
    return 1
  fi
}
ensure_ollama || true
start_ollama_if_needed || true
ensure_model_pulled "${OLLAMA_MODEL}" || true

# SearXNG - start via Docker if available and not already running.
# Use 8888 by default because 8080 is commonly taken by local Java/dev servers.
SEARXNG_PORT="${SEARXNG_PORT:-8888}"
export SEARXNG_URL="${SEARXNG_URL:-http://127.0.0.1:${SEARXNG_PORT}}"
searxng_ok() {
  curl -sf "${SEARXNG_URL%/}/search?q=test&format=json" >/dev/null 2>&1
}
docker_cli_ok() {
  command -v docker >/dev/null 2>&1
}
docker_daemon_ok() {
  docker info >/dev/null 2>&1
}
docker_app_ok() {
  [[ -d "/Applications/Docker.app" ]]
}
docker_cask_ok() {
  command -v brew >/dev/null 2>&1 && {
    brew list --cask docker-desktop >/dev/null 2>&1 || brew list --cask docker >/dev/null 2>&1
  }
}
compose_has_service() {
  local service="$1"
  [[ -f docker-compose.yml ]] || return 1
  docker compose config --services 2>/dev/null | grep -qx "$service"
}
wait_for_searxng() {
  local i=0
  while ! searxng_ok && [[ $i -lt 20 ]]; do
    sleep 1
    i=$((i + 1))
  done
  if searxng_ok; then
    echo "   SearXNG: ready at ${SEARXNG_URL}"
    return 0
  fi
  echo "   SearXNG: started but not yet responding - Research tab may need a moment"
  return 1
}
start_searxng_container() {
  echo "   SearXNG: starting directly with docker run..."
  docker rm -f localchud-searxng >/dev/null 2>&1 || true
  docker run -d \
    --name localchud-searxng \
    -p "${SEARXNG_PORT}:8080" \
    -v "${ROOT}/docker/searxng:/etc/searxng:ro" \
    --restart unless-stopped \
    searxng/searxng:latest >/dev/null
}
install_docker_if_missing() {
  if docker_cli_ok; then
    echo "   Docker: installed"
    return 0
  fi
  if docker_app_ok; then
    echo "   Docker: app installed"
    export PATH="/Applications/Docker.app/Contents/Resources/bin:${PATH:-}"
    docker_cli_ok && return 0
    echo "   Docker: app exists but CLI is not available yet"
    return 1
  fi
  if [[ "$(uname -s)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
    if docker_cask_ok; then
      echo "   Docker: installed via Homebrew"
      export PATH="/Applications/Docker.app/Contents/Resources/bin:${PATH:-}"
      docker_cli_ok && return 0
      echo "   Docker: Homebrew cask exists but CLI is not available yet"
      return 1
    fi
    mkdir -p "${ROOT}/data"
    if [[ -f "${ROOT}/data/.docker-install-attempted" ]]; then
      if [[ -e "/usr/local/bin/hub-tool" ]]; then
        echo "   Docker: previous install failed because /usr/local/bin/hub-tool exists"
        echo "           Fix: sudo rm /usr/local/bin/hub-tool"
        echo "           Then rerun: rm -f data/.docker-install-attempted && ./run.sh"
        return 1
      fi
      echo "   Docker: previous blocker is gone - retrying install"
      rm -f "${ROOT}/data/.docker-install-attempted"
    fi
    if [[ -e "/usr/local/bin/hub-tool" ]]; then
      date > "${ROOT}/data/.docker-install-attempted"
      echo "   Docker: install blocked by existing /usr/local/bin/hub-tool"
      echo "           Fix: sudo rm /usr/local/bin/hub-tool"
      return 1
    fi
    echo "   Docker: not found - installing Docker Desktop with Homebrew..."
    date > "${ROOT}/data/.docker-install-attempted"
    if ! brew install --cask docker-desktop; then
      echo "   Docker: Homebrew install failed - will not retry automatically"
      echo "           Common fix: remove conflicting /usr/local/bin/hub-tool, or install Docker Desktop manually"
      return 1
    fi
    export PATH="/Applications/Docker.app/Contents/Resources/bin:${PATH:-}"
    return 0
  fi
  echo "   Docker: not found - install Docker Desktop to enable web search"
  echo "           https://www.docker.com/products/docker-desktop/"
  return 1
}
ensure_docker_running() {
  install_docker_if_missing || return 1
  if ! docker_cli_ok; then
    echo "   Docker: command not available after install - open Docker Desktop once"
    return 1
  fi
  if docker_daemon_ok; then
    echo "   Docker: running"
    return 0
  fi
  if [[ "$(uname -s)" == "Darwin" ]]; then
    echo "   Docker: starting Docker Desktop..."
    open -a Docker >/dev/null 2>&1 || true
    local i=0
    while ! docker_daemon_ok && [[ $i -lt 45 ]]; do
      sleep 2
      i=$((i + 1))
    done
  fi
  if docker_daemon_ok; then
    echo "   Docker: ready"
    return 0
  fi
  echo "   Docker: installed but not running - open Docker Desktop, then rerun ./run.sh"
  return 1
}
start_searxng() {
  if searxng_ok; then
    echo "   SearXNG: already running at ${SEARXNG_URL}"
    return 0
  fi
  if ! ensure_docker_running; then
    echo "   SearXNG: Docker unavailable - web search disabled for now"
    return 1
  fi
  if compose_has_service searxng; then
    echo "   SearXNG: starting via Docker Compose (background)..."
    if docker compose up -d --quiet-pull searxng 2>/dev/null; then
      wait_for_searxng || true
      return 0
    fi
    echo "   SearXNG: docker compose failed - trying direct container"
  else
    echo "   SearXNG: compose service 'searxng' not found - trying direct container"
  fi

  if start_searxng_container; then
    wait_for_searxng || true
    return 0
  fi

  echo "   SearXNG: failed to start - Research tab will show an error"
  return 1
}
start_searxng || true
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
  echo "   creating venv"
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
  python3 setup.py
fi
source .venv/bin/activate
echo "   Python deps: checking requirements..."
python -m pip install -q -r requirements.txt
mkdir -p data
if [[ -f frontend/package.json ]]; then
  if [[ ! -d frontend/node_modules ]]; then
    echo "   chat UI: installing frontend deps"
    (cd frontend && npm install --silent) || echo "   chat UI: npm install failed  vanilla chat fallback"
  fi
  if command -v npm >/dev/null 2>&1; then
    (cd frontend && npm run build --silent) && echo "   chat UI: Motion bundle built" || echo "   chat UI: build skipped"
  fi
fi
echo "   ? http://${HOST}:${PORT}"
echo ""
exec uvicorn app:app --reload --host "$HOST" --port "$PORT"
