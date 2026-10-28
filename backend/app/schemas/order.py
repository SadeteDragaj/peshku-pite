"""Pydantic schemas for orders."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.order import OrderStatus


# ---------------------------------------------------------------------------
# OrderItem
# ---------------------------------------------------------------------------
class OrderItemCreate(BaseModel):
    menu_item_id: str
    quantity: int = Field(default=1, ge=1, le=50)
    size: str = ""
    addon_ids: list[str] = []
    special_instructions: str = Field(default="", max_length=300)


class OrderItemAddon(BaseModel):
    id: str
    name: str
    price: float


class OrderItemRead(BaseModel):
    id: str
    menu_item_id: str
    name: str = ""
    station: str = "kitchen"
    size: str = ""
    addons: list[OrderItemAddon] = []
    quantity: int
    unit_price: float
    subtotal: float
    special_instructions: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Order
# ---------------------------------------------------------------------------
class OrderCreate(BaseModel):
    table_id: str
    notes: str = ""
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderRead(BaseModel):
    id: str
    table_id: str
    table_number: int | None = None
    session_id: str = ""
    status: str
    notes: str
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemRead] = []

    model_config = {"from_attributes": True}
