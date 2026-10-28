"""Restaurant table ORM model."""

import secrets
import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def new_device_key() -> str:
    return secrets.token_urlsafe(16)


def new_session_id() -> str:
    return str(uuid.uuid4())


class Table(Base):
    __tablename__ = "tables"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    number: Mapped[int] = mapped_column(Integer, unique=True)
    seats: Mapped[int] = mapped_column(Integer, default=4)
    occupied: Mapped[bool] = mapped_column(Boolean, default=False)
    assigned_waiter_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, default=None
    )
    # Secret the table's tablet sends as X-Table-Key; rotate it to retire a device.
    device_key: Mapped[str] = mapped_column(String(64), default=new_device_key, nullable=False)
    # The current guest "tab". Staff start a new session when the table is cleared.
    session_id: Mapped[str] = mapped_column(String(36), default=new_session_id, nullable=False)
