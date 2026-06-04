# Acknowledgments

LocalLLM builds on ideas and patterns from several open-source projects:

- **Agent tool loop** — Inspired by [opencode](https://github.com/opencode-ai/opencode) patterns for structured tool calls and multi-round execution.
- **Cookbook / hardware fit** — Planned integration of [llmfit](https://github.com/nicepkg/llmfit)-style GGUF fit scoring under `services/hwfit/` (stub in MVP).
- **Deep Research** — Multi-step plan → search → read → synthesize pipeline (stub routes; SearXNG wired in Docker).
- **FastAPI, SQLAlchemy, ChromaDB, SearXNG, ntfy** — Infrastructure components used or bundled via Docker Compose.

Thank you to everyone maintaining local-first and privacy-respecting AI tooling.
