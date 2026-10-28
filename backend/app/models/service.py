"""Guest service requests (call waiter, water, bill) and post-meal feedback."""

import uuid
from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.table import Table


class RequestKind(StrEnum):
    WAITER = "waiter"
    WATER = "water"
    BILL = "bill"


class RequestStatus(StrEnum):
    OPEN = "open"
    DONE = "done"
    CANCELLED = "cancelled"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    table_id: Mapped[str] = mapped_column(ForeignKey("tables.id"), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String(36), default="", nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(10), default="", nullable=False)  # cash | card
    status: Mapped[str] = mapped_column(String(20), default=RequestStatus.OPEN, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    table: Mapped[Table] = relationship(lazy="selectin")

    @property
    def table_number(self) -> int | None:
        return self.table.number if self.table is not None else None


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    table_id: Mapped[str] = mapped_column(ForeignKey("tables.id"), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String(36), default="", nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    comment: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
