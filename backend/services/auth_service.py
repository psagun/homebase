"""Authentication service — register, login, token management."""

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models.user import User

REFRESH_TOKEN_TYPE = "refresh"
ACCESS_TOKEN_TYPE = "access"


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, email: str, password: str, name: str) -> dict:
        existing = self.db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )

        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=_hash_password(password),
            name=name,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return self._generate_tokens(user)

    def login(self, email: str, password: str) -> dict:
        user = self.db.query(User).filter(User.email == email).first()
        if not user or not _verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        return self._generate_tokens(user)

    def refresh_token(self, refresh_token: str) -> dict:
        try:
            payload = jwt.decode(
                refresh_token,
                settings.secret_key,
                algorithms=["HS256"],
            )
            token_type = payload.get("type")
            user_id = payload.get("sub")

            if token_type != REFRESH_TOKEN_TYPE or not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token",
                )

            try:
                uid = uuid.UUID(user_id)
            except (ValueError, AttributeError):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid user ID in token",
                )
            user = self.db.query(User).filter(User.id == uid).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                )

            return self._generate_tokens(user)

        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

    def get_user_by_id(self, user_id: str) -> User | None:
        try:
            uid = uuid.UUID(user_id)
            return self.db.query(User).filter(User.id == uid).first()
        except (ValueError, AttributeError):
            return None

    def _generate_tokens(self, user: User) -> dict:
        access_token = self._create_token(
            user_id=str(user.id),
            token_type=ACCESS_TOKEN_TYPE,
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        )
        refresh_token = self._create_token(
            user_id=str(user.id),
            token_type=REFRESH_TOKEN_TYPE,
            expires_delta=timedelta(days=settings.refresh_token_expire_days),
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "created_at": user.created_at,
            },
        }

    def _create_token(self, user_id: str, token_type: str, expires_delta: timedelta) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": user_id,
            "type": token_type,
            "iat": now,
            "exp": now + expires_delta,
        }
        return jwt.encode(payload, settings.secret_key, algorithm="HS256")
