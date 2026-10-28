"""Schemas for the guest (table tablet) API."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.service import RequestKind
from app.schemas.menu import MenuItemRead
from app.schemas.order import OrderRead


class GuestCategory(BaseModel):
    id: str
    name: str
    name_en: str = ""
    sort_order: int
    items: list[MenuItemRead] = []

    model_config = {"from_attributes": True}


class GuestTable(BaseModel):
    id: str
    number: int
    seats: int
    session_id: str


class GuestTab(BaseModel):
    """Everything the tablet needs to show order status and the running bill."""

    table_number: int
    session_id: str
    orders: list[OrderRead]
    total: float


class ServiceRequestCreate(BaseModel):
    kind: RequestKind
    payment_method: str = Field(default="", pattern="^(|cash|card)$")


class ServiceRequestRead(BaseModel):
    id: str
    table_id: str
    table_number: int | None = None
    kind: str
    payment_method: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    tags: list[str] = Field(default=[], max_length=10)
    comment: str = Field(default="", max_length=1000)
