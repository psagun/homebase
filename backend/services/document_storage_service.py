"""Document storage — Supabase Storage (private bucket) with signed URLs.

Falls back to the local filesystem when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
are not configured (local development).
"""

import os
import uuid
from pathlib import Path

from fastapi import HTTPException
from fastapi import UploadFile

from backend.config import settings

STORAGE_DIR = Path(settings.storage_local_path).resolve()

# Bucket name for all document uploads (created lazily)
BUCKET = "documents"

# Extension → expected MIME type allowlist (prevents stored-XSS via content-type tricks)
ALLOWED_CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


def _supabase_client():
    from supabase import create_client

    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        return None
    return create_client(url, key)


def _ensure_bucket(client) -> None:
    """Create the private documents bucket if it doesn't exist."""
    try:
        client.storage.get_bucket(BUCKET)
    except Exception:
        try:
            client.storage.create_bucket(BUCKET, options={"public": False})
        except Exception:
            pass  # concurrent creation is fine


def is_supabase_configured() -> bool:
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"))


async def upload_file(file: UploadFile, folder: str = "") -> str:
    """Upload a file, returning its storage key."""
    content = await file.read()
    return upload_bytes(content, file.filename, file.content_type, folder=folder)


def upload_bytes(content: bytes, filename: str, content_type: str | None = None, folder: str = "") -> str:
    """Upload raw bytes, returning its storage key.

    folder is a path prefix like "properties/{propertyId}".
    Returns the full storage key (e.g. "properties/abc/file.pdf").
    """
    client = _supabase_client()
    ext = os.path.splitext(filename or "file")[1] or ""
    # Validate content-type against the extension allowlist (server-side)
    expected_type = ALLOWED_CONTENT_TYPES.get(ext.lower())
    if not expected_type:
        raise HTTPException(status_code=400, detail=f"File type {ext} not supported")
    if content_type and content_type.split(";")[0].strip() != expected_type:
        # Some clients send generic types (e.g. application/octet-stream) — trust the extension
        if content_type.split(";")[0].strip() not in ("application/octet-stream", ""):
            raise HTTPException(status_code=400, detail=f"Content-Type mismatch for {ext}")

    file_key = f"{uuid.uuid4()}{ext}"
    key = f"{folder}/{file_key}" if folder else file_key

    if client:
        _ensure_bucket(client)
        try:
            client.storage.from_(BUCKET).upload(
                key, content,
                {"content-type": content_type or "application/octet-stream"},
            )
            return key
        except Exception as e:
            import logging
            logging.getLogger(__name__).error("Upload to Supabase failed: %s", e, exc_info=True)
            raise HTTPException(status_code=500, detail="Upload failed — please try again later.")

    # Local fallback
    dest = STORAGE_DIR / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content)
    return key


def delete_file(storage_key: str) -> None:
    """Delete a file by its storage key."""
    client = _supabase_client()
    if client:
        try:
            client.storage.from_(BUCKET).remove([storage_key])
            return
        except Exception:
            pass  # file may not exist
    # Local fallback
    path = STORAGE_DIR / storage_key
    if path.exists():
        path.unlink()


def get_file_path(storage_key: str) -> Path:
    """Local-only: resolve a storage key to a local path."""
    return STORAGE_DIR / storage_key


def create_signed_url(storage_key: str, expires_in: int = 3600) -> str:
    """Generate a short-lived signed URL for preview/download."""
    client = _supabase_client()
    if client:
        try:
            return client.storage.from_(BUCKET).create_signed_url(storage_key, expires_in)["signedURL"]
        except Exception:
            return ""
    return ""
