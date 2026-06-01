"""Hardware fit scoring (llmfit-style) — basic scan for cookbook."""

from __future__ import annotations

import os
import platform
import shutil


def scan_hardware() -> dict:
    ram_gb = None
    try:
        if hasattr(os, "sysconf"):
            ram_gb = round(
                os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / (1024**3),
                1,
            )
    except (ValueError, OSError):
        pass

    return {
        "os": platform.system(),
        "release": platform.release(),
        "machine": platform.machine(),
        "cpu": platform.processor() or platform.machine(),
        "ram_gb": ram_gb,
        "python": platform.python_version(),
        "ollama_installed": shutil.which("ollama") is not None,
        "fit_scoring": "stub — GGUF quant recommendations coming",
    }
