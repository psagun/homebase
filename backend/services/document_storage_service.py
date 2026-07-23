"""Abstract file storage service. Uses local filesystem for dev, ready for S3."""

import os
import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile
from backend.config import settings

STORAGE_DIR = Path(settings.storage_local_path).resolve()


def _ensure_dir():
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def _file_path(storage_key: str) -> Path:
    return STORAGE_DIR / storage_key


async def upload_file(file: UploadFile) -> str:
    """Save uploaded file, return storage_key."""
    _ensure_dir()
    ext = os.path.splitext(file.filename or "file")[1] or ""
    storage_key = f"{uuid.uuid4()}{ext}"
    dest = _file_path(storage_key)
    content = await file.read()
    dest.write_bytes(content)
    return storage_key


def delete_file(storage_key: str) -> None:
    """Remove a stored file."""
    path = _file_path(storage_key)
    if path.exists():
        path.unlink()


def get_file_path(storage_key: str) -> Path:
    """Return path for file download."""
    return _file_path(storage_key)
