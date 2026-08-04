"""Document CRUD with file storage."""

import uuid
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.models.document import Document
from backend.models.property import Property
from backend.services import document_storage_service


def _get_property_or_404(db: Session, user_id, property_id) -> Property:
    """Verify the user owns this property (checks direct ownership and PropertyInvestor)."""
    from backend.models.property_investor import PropertyInvestor
    link = db.query(PropertyInvestor).filter(
        PropertyInvestor.property_id == property_id,
        PropertyInvestor.user_id == user_id,
    ).first()
    if link:
        prop = db.query(Property).filter(Property.id == property_id, Property.archived_at.is_(None)).first()
        if prop:
            return prop
    prop = db.query(Property).filter(
        Property.id == property_id, Property.user_id == user_id, Property.archived_at.is_(None),
    ).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return prop


def _get_document(db: Session, user_id, doc_id) -> Document:
    """Fetch a document, verifying the user owns its property."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    _get_property_or_404(db, user_id, doc.property_id)
    return doc


def list_documents(db: Session, user_id, property_id, category: Optional[str] = None) -> list[Document]:
    _get_property_or_404(db, user_id, property_id)
    query = db.query(Document).filter(Document.property_id == property_id)
    if category:
        query = query.filter(Document.category == category)
    return query.order_by(Document.created_at.desc()).all()


async def upload_document(db: Session, user_id, property_id, file: UploadFile, category: str, name: Optional[str] = None) -> Document:
    _get_property_or_404(db, user_id, property_id)

    ALLOWED_TYPES = {".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if f".{ext}" not in ALLOWED_TYPES and ext not in ("pdf", "docx", "xlsx", "jpg", "jpeg", "png"):
        raise HTTPException(status_code=400, detail=f"File type .{ext} not supported. Allowed: {', '.join(ALLOWED_TYPES)}")

    # Store under properties/{propertyId}/ for a clean folder structure
    folder = f"properties/{property_id}"
    content = await file.read()
    storage_key = document_storage_service.upload_bytes(content, file.filename, file.content_type, folder=folder)
    doc_name = name or file.filename or "Untitled"

    safe_ext = ext if ext.startswith(".") else f".{ext}"
    doc = Document(
        id=uuid.uuid4(),
        property_id=property_id,
        user_id=user_id,
        name=doc_name,
        category=category or "Other",
        storage_key=storage_key,
        file_type=safe_ext,
        file_size=len(content),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def rename_document(db: Session, user_id, doc_id, new_name: str) -> Document:
    """Rename a document's display name."""
    doc = _get_document(db, user_id, doc_id)
    if not new_name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    doc.name = new_name.strip()
    db.commit()
    db.refresh(doc)
    return doc


async def replace_document(db: Session, user_id, doc_id, file: UploadFile) -> Document:
    """Replace the underlying file of an existing document."""
    doc = _get_document(db, user_id, doc_id)

    ALLOWED_TYPES = {".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if f".{ext}" not in ALLOWED_TYPES and ext not in ("pdf", "docx", "xlsx", "jpg", "jpeg", "png"):
        raise HTTPException(status_code=400, detail=f"File type .{ext} not supported. Allowed: {', '.join(ALLOWED_TYPES)}")

    # Upload the new file, then remove the old one
    folder = f"properties/{doc.property_id}"
    content = await file.read()
    new_key = document_storage_service.upload_bytes(content, file.filename, file.content_type, folder=folder)
    old_key = doc.storage_key
    doc.storage_key = new_key
    doc.file_type = f".{ext}" if not ext.startswith(".") else ext
    doc.file_size = len(content)
    db.commit()

    try:
        document_storage_service.delete_file(old_key)
    except Exception:
        pass  # old file may already be gone

    db.refresh(doc)
    return doc


def delete_document(db: Session, user_id, doc_id) -> None:
    doc = _get_document(db, user_id, doc_id)
    document_storage_service.delete_file(doc.storage_key)
    db.delete(doc)
    db.commit()


def get_document_path(db: Session, user_id, doc_id) -> tuple[Document, str]:
    """Local fallback path for downloads when Supabase isn't configured."""
    doc = _get_document(db, user_id, doc_id)
    path = document_storage_service.get_file_path(doc.storage_key)
    return doc, str(path)


def get_signed_url(db: Session, user_id, doc_id) -> tuple[Document, str]:
    """Return a signed URL for preview/download (Supabase) or empty (local)."""
    doc = _get_document(db, user_id, doc_id)
    url = document_storage_service.create_signed_url(doc.storage_key)
    return doc, url
