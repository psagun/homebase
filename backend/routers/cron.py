from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from backend.config import settings
from backend.dependencies import get_db
from backend.services import task_service

router = APIRouter()


@router.post("/process-reminders")
def process_reminders(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    """Cron job endpoint for processing reminders. Protected by CRON_SECRET."""
    if authorization != f"Bearer {settings.cron_secret}":
        raise HTTPException(status_code=403, detail="Invalid cron secret")
    reminders = task_service.process_reminders(db)
    return {"processed": True, "reminders": reminders}
