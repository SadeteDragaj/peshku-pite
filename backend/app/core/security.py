"""JWT token creation / verification and password hashing utilities (argon2)."""

from datetime import datetime, timedelta, timezone
from enum import StrEnum

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import JWTError, jwt

from app.core.config import settings

# ---------------------------------------------------------------------------
# Password hashing (argon2-cffi)
# ---------------------------------------------------------------------------
_ph = PasswordHasher()


def hash_password(plain: str) -> str:
    """Return an Argon2id hash of *plain*."""
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return ``True`` when *plain* matches *hashed*, ``False`` otherwise."""
    try:
        return _ph.verify(hashed, plain)
    except VerifyMismatchError:
        return False


# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------
class Role(StrEnum):
    CUSTOMER = "customer"
    WAITER = "waiter"
    KITCHEN = "kitchen"
    ADMIN = "admin"


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a short-lived JWT access token (default 15 min)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a long-lived JWT refresh token (default 7 days)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Decode *any* JWT issued by us; returns the payload dict or ``None``."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
