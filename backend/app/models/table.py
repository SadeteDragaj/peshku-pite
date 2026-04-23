"""Restaurant table ORM model."""

import uuid
from sqlalchemy import Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Table(Base):
    __tablename__ = "tables"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    number: Mapped[int] = mapped_column(Integer, unique=True)
    seats: Mapped[int] = mapped_column(Integer, default=4)
    occupied: Mapped[bool] = mapped_column(Boolean, default=False)
    assigned_waiter_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, default=None
    )
