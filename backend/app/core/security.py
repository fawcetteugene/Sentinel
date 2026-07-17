"""Security utilities for authentication and authorization."""

from datetime import datetime, timedelta, timezone
from enum import StrEnum

from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class Role(StrEnum):
    PUBLIC_USER = "public_user"
    COMMUNITY_VOLUNTEER = "community_volunteer"
    COMMUNITY_LEADER = "community_leader"
    COUNTY_ADMIN = "county_admin"
    INCIDENT_COMMANDER = "incident_commander"
    DISPATCHER = "dispatcher"
    FIELD_RESPONDER = "field_responder"
    ADMINISTRATOR = "administrator"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, role: str, expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")
