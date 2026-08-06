"""Email sending via Resend (plain httpx — no SDK dependency).

Never raises: a broken email config must not break the API call that
triggered it. When RESEND_API_KEY is unset (local dev), emails are
logged instead of sent.
"""

import logging
import os

import httpx

logger = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


def is_configured() -> bool:
    return bool(os.getenv("RESEND_API_KEY") and os.getenv("EMAIL_FROM"))


def _render(subject: str, body: str) -> str:
    return f"""<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1f2937; margin: 0 0 12px;">{subject}</h2>
  <p style="color: #4b5563; line-height: 1.6; white-space: pre-line;">{body}</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">HomeBase — property portfolio management</p>
</div>"""


def send_email(to: str, subject: str, body: str) -> None:
    """Send an email. Failures are logged, never raised."""
    if not is_configured():
        logger.info("[email] (not configured) to=%s subject=%s body=%s", to, subject, body[:200])
        return

    api_key = os.getenv("RESEND_API_KEY", "")
    from_addr = os.getenv("EMAIL_FROM", "HomeBase <onboarding@resend.dev>")
    try:
        resp = httpx.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={"from": from_addr, "to": [to], "subject": subject, "html": _render(subject, body)},
            timeout=15.0,
        )
        if resp.status_code >= 400:
            logger.error("[email] Resend error %s: %s", resp.status_code, resp.text[:300])
    except Exception:
        logger.exception("[email] send failed for %s", to)
