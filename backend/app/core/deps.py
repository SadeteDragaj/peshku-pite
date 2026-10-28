"""Shared FastAPI dependencies (DB session, current user, role checker)."""

from functools import wraps
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Role, decode_token
from app.db.session import async_session
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ---------------------------------------------------------------------------
# DB session
# ---------------------------------------------------------------------------
async def get_db() -> AsyncSession:  # type: ignore[misc]
    async with async_session() as session:
        yield session


# ---------------------------------------------------------------------------
# Current user (resolves the full User ORM object from the JWT)
# ---------------------------------------------------------------------------
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate access token and return the corresponding ``User`` row."""
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# ---------------------------------------------------------------------------
# Role-based access helpers
# ---------------------------------------------------------------------------
class RoleChecker:
    """Dependency that ensures the caller has one of the allowed roles.

    Usage::

        @router.get("/admin", dependencies=[Depends(RoleChecker([Role.ADMIN]))])
    """

    def __init__(self, allowed_roles: list[Role | str]):
        self.allowed_roles = [str(r) for r in allowed_roles]

    def __call__(self, user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user


def role_required(*roles: Role | str):
    """Decorator that restricts an endpoint to specific roles.

    Usage::

        @router.get("/kitchen-only")
        @role_required(Role.KITCHEN, Role.ADMIN)
        async def kitchen_view(user: User = Depends(get_current_user)):
            ...
    """
    allowed = [str(r) for r in roles]

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # The ``user`` kwarg is injected by ``get_current_user``
            user: User | None = kwargs.get("user") or kwargs.get("current_user")
            if user is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
            if user.role not in allowed:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
            return await func(*args, **kwargs)

        return wrapper

    return decorator
