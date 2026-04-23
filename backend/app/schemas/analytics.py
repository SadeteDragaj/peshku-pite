"""Analytics schemas."""

from datetime import date
from pydantic import BaseModel


class DailySales(BaseModel):
    sale_date: date
    order_count: int
    total_revenue: float
    avg_order_value: float
    tables_served: int
    items_sold: int


class TopMenuItem(BaseModel):
    menu_item_id: str
    item_name: str
    total_quantity: int
    total_revenue: float


class AnalyticsSummary(BaseModel):
    period_start: date
    period_end: date
    total_revenue: float
    total_orders: int
    avg_order_value: float
    total_items_sold: int
    daily: list[DailySales]
    top_items: list[TopMenuItem]
