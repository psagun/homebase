from fastapi import APIRouter

from backend.config import settings

router = APIRouter()


@router.get("")
def health_check():
    return {
        "status": "ok",
        "version": settings.app_version,
        "app": settings.app_name,
    }
