"""Pydantic schemas for the waiter dashboard."""

from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.order import OrderRead


# ---------------------------------------------------------------------------
# Table overview
# ---------------------------------------------------------------------------
class TableOverview(BaseModel):
    id: str
    number: int
    seats: int
    occupied: bool
    assigned_waiter_id: str | None = None
    assigned_waiter_name: str = ""
    active_orders: list[OrderRead] = []
    total_pending: float = 0.0

    model_config = {"from_attributes": True}


class WaiterBrief(BaseModel):
    id: str
    name: str


# ---------------------------------------------------------------------------
# Transfer table
# ---------------------------------------------------------------------------
class TransferTableRequest(BaseModel):
    target_waiter_id: str


# ---------------------------------------------------------------------------
# Split bill
# ---------------------------------------------------------------------------
class SplitBillRequest(BaseModel):
    """Split an order's items into N groups → creates N new sub-orders."""
    splits: list[list[str]] = Field(
        ...,
        min_length=2,
        description="List of groups, each group is a list of order_item_ids",
    )


class SplitBillResponse(BaseModel):
    original_order_id: str
    new_orders: list[OrderRead]


# ---------------------------------------------------------------------------
# Close order
# ---------------------------------------------------------------------------
class CloseOrderRequest(BaseModel):
    void: bool = Field(default=False, description="True = void instead of marking served")


class CloseOrderResponse(BaseModel):
    order_id: str
    new_status: str
    table_freed: bool
