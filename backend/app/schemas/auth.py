"""Pydantic schemas for authentication endpoints."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.core.security import Role


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Role = Role.CUSTOMER


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# Response bodies
# ---------------------------------------------------------------------------
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}
