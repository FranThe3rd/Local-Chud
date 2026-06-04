#!/usr/bin/env python3
"""First-run wizard for LocalLLM."""

from __future__ import annotations

import secrets
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"


def main() -> int:
    print("LocalLLM setup")
    print("=" * 30)
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "uploads").mkdir(exist_ok=True)
    (DATA / "memory").mkdir(exist_ok=True)
    env_path = ROOT / ".env"
    example = ROOT / ".env.example"
    if not env_path.exists() and example.exists():
        shutil.copy(example, env_path)
        key = secrets.token_hex(32)
        lines = []
        for line in example.read_text().splitlines():
            if line.startswith("SECRET_KEY=") and not line.split("=", 1)[1].strip():
                line = f"SECRET_KEY={key}"
            lines.append(line)
        env_path.write_text("\n".join(lines) + "\n")
    print(f"data: {DATA}")
    print("next: ./run.sh")
    return 0


if __name__ == "__main__":
    sys.exit(main())
