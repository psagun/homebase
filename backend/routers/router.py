from fastapi import APIRouter

from backend.routers.health import router as health_router
from backend.routers.dashboard import router as dashboard_router
from backend.routers.auth import router as auth_router
from backend.routers.properties import router as properties_router
from backend.routers.mortgage import router as mortgage_router
from backend.routers.insurance import router as insurance_router
from backend.routers.documents import router as documents_router
from backend.routers.tasks import router as tasks_router
from backend.routers.cron import router as cron_router
from backend.routers.transactions import router as transactions_router
from backend.routers.contacts import router as contacts_router
from backend.routers.property_modules import router as property_modules_router
from backend.routers.notifications import router as notifications_router
from backend.routers.recently_viewed import router as recently_viewed_router
from backend.routers.reports import router as reports_router
from backend.routers.seed import router as seed_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router, prefix="/health", tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(properties_router, prefix="/properties", tags=["properties"])
api_router.include_router(mortgage_router, tags=["mortgage"])
api_router.include_router(insurance_router, tags=["insurance"])
api_router.include_router(documents_router, tags=["documents"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(cron_router, prefix="/cron", tags=["cron"])
api_router.include_router(transactions_router, tags=["transactions"])
api_router.include_router(contacts_router, prefix="/contacts", tags=["contacts"])
api_router.include_router(property_modules_router, tags=["property-modules"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(recently_viewed_router, prefix="/recently-viewed", tags=["recently-viewed"])
api_router.include_router(reports_router, tags=["reports"])
api_router.include_router(seed_router, prefix="/seed", tags=["seed"])
