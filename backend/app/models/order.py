"""Order and OrderItem ORM models."""

import uuid
from datetime import datetime, timezone
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.table import Table


class OrderStatus(StrEnum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"
    VOIDED = "voided"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    table_id: Mapped[str] = mapped_column(ForeignKey("tables.id"), nullable=False, index=True)
    # Which guest tab this order belongs to (copied from Table.session_id at order time)
    session_id: Mapped[str] = mapped_column(String(36), default="", nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default=OrderStatus.PENDING, nullable=False)
    # Waiter responsible for the table when the order was placed (for per-waiter sales)
    waiter_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )
    table: Mapped["Table"] = relationship(lazy="selectin")

    @property
    def table_number(self) -> int | None:
        return self.table.number if self.table is not None else None


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    menu_item_id: Mapped[str] = mapped_column(ForeignKey("menu_items.id"), nullable=False)
    # Snapshots so tickets and bills stay correct if the menu changes later
    name: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    station: Mapped[str] = mapped_column(String(20), default="kitchen", nullable=False)
    size: Mapped[str] = mapped_column(String(8), default="", nullable=False)
    addons: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)
    special_instructions: Mapped[str] = mapped_column(Text, default="", nullable=False)

    order: Mapped["Order"] = relationship(back_populates="items")
