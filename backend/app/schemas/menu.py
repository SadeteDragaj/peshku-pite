"""Pydantic schemas for menu categories and items."""

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Pagination wrapper
# ---------------------------------------------------------------------------
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


# ---------------------------------------------------------------------------
# Item options (sizes & add-ons)
# ---------------------------------------------------------------------------
class SizeOption(BaseModel):
    code: str = Field(max_length=8)  # S | M | L | XL
    price: float = Field(gt=0)


class AddonOption(BaseModel):
    id: str = Field(max_length=40)
    name: str
    name_en: str = ""
    price: float = Field(ge=0)


# ---------------------------------------------------------------------------
# MenuCategory
# ---------------------------------------------------------------------------
class MenuCategoryCreate(BaseModel):
    name: str = Field(max_length=120)
    name_en: str = ""
    description: str = ""
    sort_order: int = 0


class MenuCategoryUpdate(BaseModel):
    name: str | None = None
    name_en: str | None = None
    description: str | None = None
    sort_order: int | None = None


class MenuCategoryRead(BaseModel):
    id: str
    name: str
    name_en: str = ""
    description: str
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MenuCategoryReadWithItems(MenuCategoryRead):
    items: list["MenuItemRead"] = []


# ---------------------------------------------------------------------------
# MenuItem
# ---------------------------------------------------------------------------
class MenuItemCreate(BaseModel):
    category_id: str
    name: str = Field(max_length=200)
    name_en: str = ""
    description: str = ""
    description_en: str = ""
    price: float = Field(gt=0)
    image_url: str = ""
    available: bool = True
    sort_order: int = 0
    is_popular: bool = False
    is_signature: bool = False
    is_alcoholic: bool = False
    station: str = "kitchen"
    sizes: list[SizeOption] = []
    addons: list[AddonOption] = []


class MenuItemUpdate(BaseModel):
    category_id: str | None = None
    name: str | None = None
    name_en: str | None = None
    description: str | None = None
    description_en: str | None = None
    is_popular: bool | None = None
    is_signature: bool | None = None
    is_alcoholic: bool | None = None
    station: str | None = None
    sizes: list[SizeOption] | None = None
    addons: list[AddonOption] | None = None
    price: float | None = Field(default=None, gt=0)
    image_url: str | None = None
    available: bool | None = None
    sort_order: int | None = None


class MenuItemRead(BaseModel):
    id: str
    category_id: str
    name: str
    name_en: str = ""
    description: str
    description_en: str = ""
    price: float
    image_url: str
    available: bool
    sort_order: int
    is_popular: bool = False
    is_signature: bool = False
    is_alcoholic: bool = False
    station: str = "kitchen"
    sizes: list[SizeOption] = []
    addons: list[AddonOption] = []
    created_at: datetime

    model_config = {"from_attributes": True}


# Rebuild forward refs so MenuCategoryReadWithItems can see MenuItemRead
MenuCategoryReadWithItems.model_rebuild()
