# local chud

**Self-hosted, local-first AI workspace** — MIT licensed. Slightly janky. Yours.

```bash
./run.sh
```

`run.sh` will install Ollama via Homebrew or ollama.com if missing, and run `ollama serve` in the background **only when** the API at `http://127.0.0.1:11434` is not already up.

Open **http://127.0.0.1:7001** · override port: `LOCALCHUD_PORT=7002 ./run.sh`

## Features

Chat (Motion animations, memory-aware prompts, agent tools) · documents · memory · tasks · research · compare · cookbook · settings (Ollama).

Chat UI is built with React + [Motion](https://motion.dev). `./run.sh` runs `npm run build` in `frontend/` when `package.json` is present. Manual rebuild:

```bash
cd frontend && npm install && npm run build
```

Email/calendar — planned. Inspired by Odysseus-style homelab workspaces.

## Docker

```bash
docker compose up --build
```

## License

MIT — see [LICENSE](LICENSE).
# Local-Chud
