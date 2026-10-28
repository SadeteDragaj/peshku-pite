"""Menu ORM models: MenuCategory and MenuItem."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Station:
    """Where an item is prepared – drives the kitchen / bar filter on the KDS."""

    KITCHEN = "kitchen"
    BAR = "bar"


class MenuCategory(Base):
    __tablename__ = "menu_categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    name_en: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    items: Mapped[list["MenuItem"]] = relationship(
        back_populates="category", cascade="all, delete-orphan", lazy="selectin"
    )


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    category_id: Mapped[str] = mapped_column(ForeignKey("menu_categories.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_en: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    description_en: Mapped[str] = mapped_column(Text, default="", nullable=False)
    # Base price. 0 means "price not set yet" – such items can't be ordered.
    price: Mapped[float] = mapped_column(Float, nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Tablet extras
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_signature: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_alcoholic: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    station: Mapped[str] = mapped_column(String(20), default=Station.KITCHEN, nullable=False)
    # [{"code": "S", "price": 4.99}, ...] – empty list = no size choice
    sizes: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    # [{"id": "tartar", "name": "Salcë tartar", "name_en": "Tartar sauce", "price": 0.49}, ...]
    addons: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    category: Mapped["MenuCategory"] = relationship(back_populates="items", lazy="selectin")
