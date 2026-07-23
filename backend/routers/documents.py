import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.schemas.document import DocumentResponse
from backend.services import document_service

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


@router.get("/documents/{doc_id}/download")
def download_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    doc, path = document_service.get_document_path(db, current_user.id, doc_id)
    return FileResponse(path, filename=doc.name, media_type="application/octet-stream")


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    document_service.delete_document(db, current_user.id, doc_id)
