import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.config import settings
from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from backend.services import task_service

router = APIRouter()


@router.get("/", response_model=list[TaskResponse])
def list_tasks(
    status: Optional[str] = Query(None),
    task_type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    property_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return task_service.list_tasks(db, current_user.id, status, task_type, priority, property_id, search)


@router.post("/", response_model=TaskResponse, status_code=201)
def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return task_service.create_task(db, current_user.id, data)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return task_service.get_task(db, current_user.id, task_id)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: uuid.UUID, data: TaskUpdate,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return task_service.update_task(db, current_user.id, task_id, data)


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    task_service.delete_task(db, current_user.id, task_id)
