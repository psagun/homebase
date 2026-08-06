import bcrypt
import os
import secrets
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, File, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.config import settings
from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.ratelimit import rate_limit
from backend.services import document_storage_service
from backend.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from backend.services.auth_service import AuthService


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


class ProfileUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)


class GoogleAuthRequest(BaseModel):
    access_token: str = Field(..., min_length=1)

router = APIRouter()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the authenticated user's password."""
    if not bcrypt.checkpw(data.current_password.encode("utf-8"), current_user.password_hash.encode("utf-8")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")
    current_user.password_hash = bcrypt.hashpw(data.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db.commit()
    return {"message": "Password updated successfully"}


# Allowed image uploads: content-type -> file extension. The extension comes
# from the MIME type, NEVER from the client-supplied filename — a trusted
# extension prevents serving attacker-controlled HTML/SVG as same-origin.
ALLOWED_AVATAR_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a profile picture."""
    ext = ALLOWED_AVATAR_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, WebP, and GIF images are allowed")

    # Read in chunks and reject oversized files before buffering them all
    chunks = []
    size = 0
    while True:
        chunk = await file.read(64 * 1024)
        if not chunk:
            break
        size += len(chunk)
        if size > MAX_AVATAR_BYTES:
            raise HTTPException(status_code=413, detail="Image is too large (max 2 MB)")
        chunks.append(chunk)
    content = b"".join(chunks)

    # Extension derived from the validated MIME type
    filename = f"{uuid.uuid4()}{ext}"

    # Production: store in Supabase Storage (serverless FS is read-only).
    # avatar_url stores the storage key ("avatars/<file>"); display needs a
    # signed-URL fetch (frontend pass).
    if document_storage_service.is_supabase_configured():
        key = document_storage_service.upload_bytes(
            content, filename, content_type=file.content_type, folder="avatars"
        )
        avatar_url = key
    else:
        # Local dev fallback — lazy dir creation
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "avatars")
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(content)
        avatar_url = f"/uploads/avatars/{filename}"

    # Update user
    current_user.avatar_url = avatar_url
    db.commit()

    return {"avatar_url": avatar_url}


def _set_token_cookies(response: Response, data: dict) -> dict:
    """Set auth tokens as HTTP-only cookies on the response.

    `secure` is only enabled in production so local HTTP development still
    works; tokens must never ride cleartext on a public deployment.
    """
    secure = settings.environment == "production"
    response.set_cookie(
        key="access_token",
        value=data["access_token"],
        httponly=True,
        samesite="lax",
        secure=secure,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=data["refresh_token"],
        httponly=True,
        samesite="lax",
        secure=secure,
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth",
    )
    return data


@router.post("/register", response_model=TokenResponse)
@rate_limit("10/minute")
def register(
    request: Request,
    data: RegisterRequest,
    response: Response,
    auth: AuthService = Depends(get_auth_service),
):
    result = auth.register(email=data.email, password=data.password, name=data.name)
    return _set_token_cookies(response, result)


@router.post("/google", response_model=TokenResponse)
@rate_limit("10/minute")
def google_auth(
    request: Request,
    data: GoogleAuthRequest,
    response: Response,
    db: Session = Depends(get_db),
    auth: AuthService = Depends(get_auth_service),
):
    """Sign in with Google via Supabase Auth.

    Verifies the Supabase session token server-side (service-role client),
    then finds-or-creates the matching HomeBase account by email and
    issues the app's own JWT cookies — the rest of the app is unchanged.
    New accounts get role "user", same as self-registration.
    """
    from backend.services import document_storage_service

    client = document_storage_service.get_supabase_admin_client()
    if not client:
        raise HTTPException(status_code=503, detail="Supabase auth is not configured")
    try:
        supabase_user = client.auth.get_user(data.access_token).user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired Google session")

    email = (supabase_user.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Google account has no email address")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Auto-create. Google accounts have no app password — hash a random
        # unguessable value so the password flow can never be used for them.
        metadata = supabase_user.user_metadata or {}
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=bcrypt.hashpw(
                secrets.token_urlsafe(32).encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8"),
            name=metadata.get("full_name") or email.split("@")[0],
            role="user",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    result = auth._generate_tokens(user)
    return _set_token_cookies(response, result)


@router.post("/login", response_model=TokenResponse)
@rate_limit("20/minute")
def login(
    request: Request,
    data: LoginRequest,
    response: Response,
    auth: AuthService = Depends(get_auth_service),
):
    result = auth.login(email=data.email, password=data.password)
    return _set_token_cookies(response, result)


@router.post("/refresh", response_model=TokenResponse)
@rate_limit("30/minute")
def refresh(
    request: Request,
    data: RefreshRequest,
    response: Response,
    auth: AuthService = Depends(get_auth_service),
):
    result = auth.refresh_token(data.refresh_token)
    return _set_token_cookies(response, result)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated user's profile."""
    if data.name is not None:
        current_user.name = data.name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth")
    return {"message": "Logged out successfully"}
