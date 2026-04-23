"""Pydantic schemas for inventory management."""

from datetime import datetime
from pydantic import BaseModel, Field

from app.models.inventory import TransactionType


# ---------------------------------------------------------------------------
# InventoryItem
# ---------------------------------------------------------------------------
class InventoryItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    unit: str = Field(default="unit", max_length=30)
    quantity_on_hand: float = Field(default=0, ge=0)
    low_stock_threshold: float = Field(default=10, ge=0)
    cost_per_unit: float = Field(default=0, ge=0)


class InventoryItemUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    low_stock_threshold: float | None = None
    cost_per_unit: float | None = None


class InventoryItemRead(BaseModel):
    id: str
    name: str
    unit: str
    quantity_on_hand: float
    low_stock_threshold: float
    cost_per_unit: float
    is_low_stock: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# InventoryTransaction
# ---------------------------------------------------------------------------
class TransactionCreate(BaseModel):
    inventory_item_id: str
    transaction_type: TransactionType
    quantity_change: float = Field(description="Positive to add, negative to deduct")
    notes: str = ""


class TransactionRead(BaseModel):
    id: str
    inventory_item_id: str
    transaction_type: str
    quantity_change: float
    notes: str
    reference_order_id: str | None = None
    created_by: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Menu-Item ↔ Ingredient linkage
# ---------------------------------------------------------------------------
class IngredientLinkCreate(BaseModel):
    menu_item_id: str
    inventory_item_id: str
    quantity_needed: float = Field(gt=0)


class IngredientLinkRead(BaseModel):
    id: str
    menu_item_id: str
    inventory_item_id: str
    quantity_needed: float

    model_config = {"from_attributes": True}
