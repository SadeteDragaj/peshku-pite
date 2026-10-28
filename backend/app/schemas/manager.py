"""Pydantic schemas for the manager board."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

StaffRole = Literal["waiter", "kitchen", "admin"]


# ---------------------------------------------------------------------------
# Staff
# ---------------------------------------------------------------------------
class StaffMember(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    active: bool
    created_at: datetime
    table_numbers: list[int] = []


class StaffCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    role: StaffRole = "waiter"


class StaffUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    role: StaffRole | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    active: bool | None = None


# ---------------------------------------------------------------------------
# Tables
# ---------------------------------------------------------------------------
class ManagerTable(BaseModel):
    id: str
    number: int
    seats: int
    occupied: bool
    assigned_waiter_id: str | None = None
    assigned_waiter_name: str = ""
    open_orders: int = 0
    pending_total: float = 0.0


class TableAssignment(BaseModel):
    waiter_id: str | None = None  # None = unassigned


# ---------------------------------------------------------------------------
# Day summary
# ---------------------------------------------------------------------------
class HourSales(BaseModel):
    hour: int
    revenue: float
    orders: int


class WaiterSales(BaseModel):
    waiter_id: str | None
    name: str
    revenue: float
    orders: int


class ItemSales(BaseModel):
    name: str
    quantity: int
    revenue: float


class DayTotal(BaseModel):
    day: date
    revenue: float
    orders: int


class DaySummary(BaseModel):
    day: date
    revenue: float
    orders: int
    avg_order: float
    items_sold: int
    tabs: int  # guest groups (table sessions) that ordered
    voided_orders: int
    voided_value: float
    open_orders: int  # right now, not just today
    open_requests: int
    avg_rating: float | None
    reviews: int
    by_hour: list[HourSales]
    by_waiter: list[WaiterSales]
    top_items: list[ItemSales]
    last_7_days: list[DayTotal]


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------
class Review(BaseModel):
    id: str
    table_number: int | None
    rating: int
    tags: list[str]
    comment: str
    created_at: datetime


class TagCount(BaseModel):
    tag: str
    count: int


class ReviewsOverview(BaseModel):
    count: int
    average: float | None
    distribution: list[int]  # index 0 = 1 star … index 4 = 5 stars
    top_tags: list[TagCount]
    reviews: list[Review]
