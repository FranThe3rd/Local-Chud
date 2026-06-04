# LocalLLM

A local-first AI workspace that runs on your machine — chat, documents, memory, web research, and model compare — powered by [Ollama](https://ollama.com). No API keys, no cloud required.

Inspired by the idea of a private, self-hosted assistant you actually own.

---

## Quick start (macOS)

The easiest way to run LocalLLM on a Mac is the included startup script. It handles almost everything for you.

```bash
git clone https://github.com/FranThe3rd/LocalLLM.git
cd LocalLLM
chmod +x run.sh
./run.sh
```

Then open:

```text
http://127.0.0.1:7001
```

You’ll land on the home page — click **Get Started** to open the app.

> **Note:** `./run.sh` is built and tested for **macOS** right now. Linux may work with manual setup; Windows is not supported by the script yet.

---

## What `./run.sh` does

You don’t need to install much yourself. The script:

1. Creates a Python virtual environment (`.venv`) and installs dependencies
2. Installs **Ollama** via Homebrew (or the official installer) if it’s missing
3. Starts `ollama serve` if Ollama isn’t already running
4. Pulls a default model (`llama3.2`) if you don’t have one yet
5. Optionally starts **SearXNG** via Docker for the Research tab (web search)
6. Builds the enhanced chat UI bundle when **Node.js** is available
7. Launches the FastAPI server with hot reload

First run can take a few minutes (Ollama install, model download, pip install). Later runs are much faster.

---

## Requirements

| | Required? | Notes |
|---|---|---|
| **macOS** | Yes (for `./run.sh`) | Script uses Homebrew, `open`, and Mac paths |
| **Python 3.10+** | Yes | Used for the backend; `run.sh` creates `.venv` |
| **Ollama** | Auto | Installed and started by `run.sh` if needed |
| **Node.js** | Optional | Only for building the Motion/React chat bundle in `frontend/`. If Node isn’t installed, the app still runs with the vanilla chat UI |
| **Docker** | Optional | Used for SearXNG (Research tab). Chat and everything else works without it |

You might want **Homebrew** on Mac — it makes Ollama and Docker installs smoother, but the script can fall back to other installers.

---

## Configuration

Copy env defaults on first run (`.env` from `.env.example`).

**Change port:**

```bash
LOCALLLM_PORT=7002 ./run.sh
```

**Default model to pull on first run:**

```bash
OLLAMA_MODEL=qwen2.5:7b ./run.sh
```

**Ollama URL** (if not local):

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434 ./run.sh
```

Settings inside the app (Ollama connection, default model, download/remove models) are saved per install.

---

## Using the app

| Area | What it does |
|---|---|
| **Chat** | Streaming chat with your local model; optional agent mode |
| **Documents** | Markdown docs you can edit and reference in chat |
| **Memory** | Facts the agent can recall (stored locally) |
| **Research** | Web search via SearXNG (needs Docker + SearXNG running) |
| **Compare** | Run the same prompt on two Ollama models side by side |
| **Cookbook** | Hardware scan and local model ops |
| **Tasks** | Simple todo list |
| **Settings** | Ollama URL, default model, download/remove models |

On first boot, an admin user is created and printed in the terminal. Change the password after logging in if auth is enabled.

---

## Frontend (optional manual build)

The main UI is served as static files. `./run.sh` runs `npm install` and `npm run build` in `frontend/` when Node is present.

To rebuild the Motion chat bundle yourself:

```bash
cd frontend
npm install
npm run build
```

If you skip this, chat still works — you just get the vanilla fallback instead of the full React/Motion bundle.

---

## Docker (alternative)

You can also run with Docker Compose (useful if you prefer containers over `./run.sh`):

```bash
docker compose up --build
```

---

## Project layout

```text
app.py              FastAPI entrypoint
run.sh              macOS startup script (recommended)
static/             Web UI (HTML, CSS, JS)
frontend/           Optional React/Motion chat bundle
routes/             API routes
services/           Business logic
src/llm/            Ollama client
data/               Local SQLite, uploads, logs (created at runtime)
```

---

## License

MIT — see [LICENSE](LICENSE).

See [ACKNOWLEDGMENTS.md](ACKNOWLEDGMENTS.md) for credits and upstream inspiration.
