"""File upload — extract text for use in chat context."""
from __future__ import annotations

import io
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from core.auth import get_current_user
from core.db import User

router = APIRouter(prefix="/api/upload", tags=["upload"])

MAX_SIZE = 4 * 1024 * 1024  # 4 MB

TEXT_EXTENSIONS = {
    ".txt", ".md", ".markdown", ".csv", ".json", ".jsonl",
    ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css",
    ".xml", ".yaml", ".yml", ".toml", ".ini", ".sh", ".bash",
    ".sql", ".r", ".go", ".rs", ".java", ".c", ".cpp", ".h",
    ".hpp", ".cs", ".rb", ".php", ".swift", ".kt", ".dart",
    ".env", ".log", ".rst", ".tex",
}


def _extract_text(filename: str, data: bytes) -> str:
    from pathlib import Path
    ext = Path(filename).suffix.lower()

    if ext in TEXT_EXTENSIONS:
        for enc in ("utf-8", "latin-1", "cp1252"):
            try:
                return data.decode(enc)
            except UnicodeDecodeError:
                continue
        return data.decode("utf-8", errors="replace")

    if ext == ".pdf":
        return _extract_pdf(data)

    # Fallback — try plain text decode
    try:
        text = data.decode("utf-8", errors="strict")
        if text.isprintable() or "\n" in text:
            return text
    except Exception:
        pass

    raise HTTPException(
        status_code=415,
        detail=f"Unsupported file type '{ext}'. Supported: text files, PDF.",
    )


def _extract_pdf(data: bytes) -> str:
    try:
        import pypdf  # optional dep
        reader = pypdf.PdfReader(io.BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(p for p in pages if p.strip())
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="PDF support requires `pip install pypdf`. Plain text files work without it.",
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read PDF: {e}")


@router.post("")
async def upload_file(
    file: Annotated[UploadFile, File()],
    user: Annotated[User, Depends(get_current_user)],
):
    data = await file.read(MAX_SIZE + 1)
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 4 MB).")

    text = _extract_text(file.filename or "file.txt", data)

    # Trim to ~30k chars so we don't blow up context windows
    trimmed = text[:30_000]
    was_trimmed = len(text) > 30_000

    return {
        "filename": file.filename,
        "size": len(data),
        "text": trimmed,
        "trimmed": was_trimmed,
        "chars": len(trimmed),
    }
