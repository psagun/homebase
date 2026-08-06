"""Email notifications — respects per-category opt-in prefs.

Categories: account, property, tenant, maintenance, payment, bill, document.
NULL prefs (or missing category) = enabled.
"""

import json
import logging

from sqlalchemy.orm import Session

from backend.models.user import User
from backend.services import email_service

logger = logging.getLogger(__name__)

DEFAULT_PREFS = {
    "account": True,
    "property": True,
    "tenant": True,
    "maintenance": True,
    "payment": True,
    "bill": True,
    "document": True,
}


def get_prefs(user: User) -> dict:
    if not user.notification_prefs:
        return dict(DEFAULT_PREFS)
    try:
        prefs = json.loads(user.notification_prefs)
    except (ValueError, TypeError):
        return dict(DEFAULT_PREFS)
    merged = dict(DEFAULT_PREFS)
    merged.update({k: bool(v) for k, v in prefs.items() if k in DEFAULT_PREFS})
    return merged


def set_prefs(user: User, prefs: dict) -> dict:
    merged = dict(DEFAULT_PREFS)
    merged.update({k: bool(v) for k, v in prefs.items() if k in DEFAULT_PREFS})
    user.notification_prefs = json.dumps(merged)
    return merged


def maybe_send(db: Session, user_id, category: str, subject: str, body: str) -> None:
    """Send a notification email if the category is enabled. Never raises."""
    try:
        user = db.get(User, user_id)
        if not user or not user.email:
            return
        if not get_prefs(user).get(category, True):
            return
        email_service.send_email(user.email, subject, body)
    except Exception:
        logger.exception("[notify] failed for user %s", user_id)
