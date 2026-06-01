# Local Chud

This is a vibe-coded AI project powered by Ollama, basically copying PewDiePie's project.

Run large language models on your own machine with a modern chat interface, memory, document support, research tools, and agent capabilities — no cloud required.

## Quick Start Only Works On Mac Rn

```bash
./run.sh
```

The startup script will:

* Install Ollama if it isn't already installed
* Start `ollama serve` automatically when needed
* Launch the Local Chud backend
* Build the React frontend when required

Open:

```text
http://127.0.0.1:7001
```

Use a different port:

```bash
LOCALCHUD_PORT=7002 ./run.sh
```

---

## Features

### Chat

* Streaming responses
* Conversation memory
* Tool calling
* Agent workflows
* Motion-powered UI animations

### Documents

* Upload and chat with documents
* Context-aware retrieval
* Local processing

### Research

* Deep research workflows
* Multi-source comparison
* Information synthesis

### Tasks

* Persistent task management
* AI-assisted planning
* Workflow automation

### Cookbook

* Save and reuse prompts
* Custom workflows
* Template library

### Settings

* Ollama model management
* Local configuration
* Performance tuning

---

## Frontend

Built with:

* React
* Motion
* Vite

Manual rebuild:

```bash
cd frontend

npm install
npm run build
```

---

## Docker

Build and run with Docker:

```bash
docker compose up --build
```

