import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.schemas.document import DocumentResponse
from backend.services import document_service, document_storage_service

router = APIRouter()


@router.get("/properties/{property_id}/documents", response_model=list[DocumentResponse])
def list_documents(
    property_id: uuid.UUID,
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return document_service.list_documents(db, current_user.id, property_id, category)


@router.post("/properties/{property_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    property_id: uuid.UUID,
    file: UploadFile = File(...),
    category: str = Query("Other"),
    name: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return await document_service.upload_document(db, current_user.id, property_id, file, category, name)


@router.patch("/documents/{doc_id}", response_model=DocumentResponse)
def rename_document(
    doc_id: uuid.UUID,
    name: str = Query(..., description="New document name"),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return document_service.rename_document(db, current_user.id, doc_id, name)


@router.put("/documents/{doc_id}", response_model=DocumentResponse)
async def replace_document(
    doc_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return await document_service.replace_document(db, current_user.id, doc_id, file)


@router.get("/documents/{doc_id}/download")
def download_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    # Production files live in Supabase Storage — redirect to a signed URL
    # (files are not on the serverless FS, so FileResponse would 404).
    # Local dev falls back to the on-disk file.
    doc, signed_url = document_service.get_signed_url(db, current_user.id, doc_id)
    if signed_url:
        return RedirectResponse(signed_url)
    path = document_storage_service.get_file_path(doc.storage_key)
    return FileResponse(path, filename=doc.name, media_type="application/octet-stream")


@router.get("/documents/{doc_id}/preview")
def preview_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """Return a signed URL for in-browser preview (Supabase) or the download path (local)."""
    doc, signed_url = document_service.get_signed_url(db, current_user.id, doc_id)
    if signed_url:
        return {"url": signed_url, "name": doc.name, "file_type": doc.file_type}
    # Local fallback: return the download endpoint as the preview URL
    return {"url": f"/api/v1/documents/{doc.id}/download", "name": doc.name, "file_type": doc.file_type}


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    document_service.delete_document(db, current_user.id, doc_id)
