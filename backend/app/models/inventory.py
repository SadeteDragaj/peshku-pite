"""Inventory ORM models: InventoryItem and InventoryTransaction."""

import uuid
from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TransactionType(StrEnum):
    PURCHASE = "purchase"      # stock added via purchase
    WASTAGE = "wastage"        # stock lost / spoiled
    CONSUMPTION = "consumption"  # auto-deducted when order placed
    ADJUSTMENT = "adjustment"  # manual correction


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False, default="unit")  # kg, litre, unit …
    quantity_on_hand: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    low_stock_threshold: Mapped[float] = mapped_column(Float, default=10, nullable=False)
    cost_per_unit: Mapped[float] = mapped_column(Float, default=0, nullable=False)
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

    transactions: Mapped[list["InventoryTransaction"]] = relationship(
        back_populates="inventory_item", cascade="all, delete-orphan", lazy="selectin"
    )


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    inventory_item_id: Mapped[str] = mapped_column(
        ForeignKey("inventory_items.id"), nullable=False, index=True
    )
    transaction_type: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity_change: Mapped[float] = mapped_column(Float, nullable=False)  # positive=add, negative=deduct
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    reference_order_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("orders.id"), nullable=True, default=None
    )
    created_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    inventory_item: Mapped["InventoryItem"] = relationship(back_populates="transactions")


class MenuItemIngredient(Base):
    """Links a MenuItem to the InventoryItems it consumes (recipe)."""
    __tablename__ = "menu_item_ingredients"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    menu_item_id: Mapped[str] = mapped_column(
        ForeignKey("menu_items.id"), nullable=False, index=True
    )
    inventory_item_id: Mapped[str] = mapped_column(
        ForeignKey("inventory_items.id"), nullable=False, index=True
    )
    quantity_needed: Mapped[float] = mapped_column(Float, nullable=False)  # per 1 menu item
