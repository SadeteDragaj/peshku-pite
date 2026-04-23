"""Pydantic schemas for orders."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.order import OrderStatus
from app.schemas.menu import PaginatedResponse  # reuse generic wrapper


# ---------------------------------------------------------------------------
# OrderItem
# ---------------------------------------------------------------------------
class OrderItemCreate(BaseModel):
    menu_item_id: str
    quantity: int = Field(default=1, ge=1)
    special_instructions: str = ""


class OrderItemRead(BaseModel):
    id: str
    menu_item_id: str
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
    status: str
    notes: str
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemRead] = []

    model_config = {"from_attributes": True}
