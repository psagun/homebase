"""Document CRUD with file storage."""

import uuid
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.models.document import Document
from backend.models.property import Property
from backend.services import document_storage_service


def _get_property_or_404(db: Session, user_id, property_id) -> Property:
    prop = db.query(Property).filter(
        Property.id == property_id, Property.user_id == user_id, Property.archived_at.is_(None),
    ).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return prop


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

    storage_key = await document_storage_service.upload_file(file)
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
        file_size=0,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def delete_document(db: Session, user_id, doc_id) -> None:
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    prop = db.query(Property).filter(Property.id == doc.property_id, Property.user_id == user_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    document_storage_service.delete_file(doc.storage_key)
    db.delete(doc)
    db.commit()


def get_document_path(db: Session, user_id, doc_id) -> tuple[Document, str]:
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    prop = db.query(Property).filter(Property.id == doc.property_id, Property.user_id == user_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    path = document_storage_service.get_file_path(doc.storage_key)
    return doc, str(path)
