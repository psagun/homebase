"""Task CRUD with overdue detection and filters."""

import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.models.task import Task, TaskStatus, TaskPriority, TaskType


def _parse_enum(cls, value):
    try:
        return cls(value)
    except (ValueError, TypeError):
        return None


def _refresh_status(task: Task) -> None:
    """Update task status based on due_date."""
    if task.status in (TaskStatus.COMPLETED, TaskStatus.DISMISSED):
        return
    if task.due_date:
        today = date.today()
        if task.due_date < today:
            task.status = TaskStatus.OVERDUE
        elif task.due_date == today:
            task.status = TaskStatus.DUE_TODAY
        else:
            task.status = TaskStatus.UPCOMING


def list_tasks(
    db: Session, user_id,
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    priority: Optional[str] = None,
    property_id: Optional[str] = None,
    search: Optional[str] = None,
) -> list[Task]:
    query = db.query(Task).filter(Task.user_id == user_id)

    if status:
        status_enum = _parse_enum(TaskStatus, status.title().replace("_", " "))
        if status_enum is None:
            raise HTTPException(status_code=422, detail=f"Invalid status: {status}")
        query = query.filter(Task.status == status_enum)
    if task_type:
        type_enum = _parse_enum(TaskType, task_type)
        if type_enum:
            query = query.filter(Task.task_type == type_enum)
    if priority:
        pri_enum = _parse_enum(TaskPriority, priority)
        if pri_enum:
            query = query.filter(Task.priority == pri_enum)
    if property_id:
        try:
            query = query.filter(Task.property_id == uuid.UUID(property_id))
        except (ValueError, AttributeError):
            pass
    if search:
        term = f"%{search}%"
        query = query.filter(Task.title.ilike(term))

    # Refresh status before returning — only write back when a status actually
    # changed, so plain reads don't generate UPDATEs against the DB.
    tasks = query.options(joinedload(Task.property)).order_by(
        Task.due_date.asc().nullslast(), Task.created_at.desc()
    ).all()
    # Status is derived from due_date on read only - never persisted here
    # (the cron refresher owns status writes). Plain reads must not issue
    # UPDATEs against the DB.
    for t in tasks:
        _refresh_status(t)
        t.property_name = t.property.name if t.property else None
    return tasks


def create_task(db: Session, user_id, data) -> Task:
    type_enum = _parse_enum(TaskType, data.task_type) or TaskType.CUSTOM
    pri_enum = _parse_enum(TaskPriority, data.priority) or TaskPriority.MEDIUM

    task = Task(
        id=uuid.uuid4(),
        user_id=user_id,
        property_id=uuid.UUID(data.property_id) if data.property_id else None,
        title=data.title,
        description=data.description,
        task_type=type_enum,
        due_date=data.due_date,
        priority=pri_enum,
    )
    _refresh_status(task)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def get_task(db: Session, user_id, task_id) -> Task:
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    _refresh_status(task)  # in-memory only - no write-on-read
    # Fetch property name from relationship
    if hasattr(task, "property") and task.property:
        task.property_name = task.property.name
    else:
        task.property_name = None
    return task


def update_task(db: Session, user_id, task_id, data) -> Task:
    task = get_task(db, user_id, task_id)
    update_data = data.model_dump(exclude_unset=True)

    if "task_type" in update_data:
        enum_val = _parse_enum(TaskType, update_data["task_type"])
        if enum_val:
            update_data["task_type"] = enum_val
    if "priority" in update_data:
        enum_val = _parse_enum(TaskPriority, update_data["priority"])
        if enum_val:
            update_data["priority"] = enum_val
    if "status" in update_data:
        enum_val = _parse_enum(TaskStatus, update_data["status"])
        if enum_val:
            update_data["status"] = enum_val
            if enum_val == TaskStatus.COMPLETED:
                update_data["completed_at"] = datetime.now(timezone.utc)

    for key, value in update_data.items():
        setattr(task, key, value)
    _refresh_status(task)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, user_id, task_id) -> None:
    task = get_task(db, user_id, task_id)
    db.delete(task)
    db.commit()


def process_reminders(db: Session):
    """Find tasks that need reminder notifications. Idempotent."""
    today = date.today()
    from datetime import timedelta

    reminders = {
        "overdue": db.query(Task).filter(
            Task.user_id is not None, Task.due_date < today,
            Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.DISMISSED]),
        ).count(),
        "due_today": db.query(Task).filter(
            Task.due_date == today,
            Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.DISMISSED]),
        ).count(),
        "due_in_7_days": db.query(Task).filter(
            Task.due_date == today + timedelta(days=7),
            Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.DISMISSED]),
        ).count(),
        "due_in_30_days": db.query(Task).filter(
            Task.due_date == today + timedelta(days=30),
            Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.DISMISSED]),
        ).count(),
    }

    # Auto-update status for overdue/due today tasks
    db.query(Task).filter(
        Task.due_date < today,
        Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.DISMISSED]),
    ).update({Task.status: TaskStatus.OVERDUE}, synchronize_session=False)

    db.query(Task).filter(
        Task.due_date == today,
        Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.DISMISSED]),
    ).update({Task.status: TaskStatus.DUE_TODAY}, synchronize_session=False)

    db.commit()
    return reminders
