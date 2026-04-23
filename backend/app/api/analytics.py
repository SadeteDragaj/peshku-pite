"""Analytics endpoints – daily sales, top items, summary stats.

Uses raw SQL queries against the orders/order_items tables for broad DB
compatibility (works on both Postgres and SQLite for dev/test).
The materialized view `daily_sales_summary` can be used in production Postgres
for faster reads – see daily_sales_view.sql.
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import RoleChecker, get_db
from app.core.security import Role
from app.schemas.analytics import AnalyticsSummary, DailySales, TopMenuItem

router = APIRouter()

_admin = [Depends(RoleChecker([Role.ADMIN]))]


@router.get(
    "/daily-sales",
    response_model=AnalyticsSummary,
    dependencies=_admin,
    summary="Daily sales data for charts",
)
async def daily_sales(
    db: AsyncSession = Depends(get_db),
    date_start: date = Query(default=None, alias="from"),
    date_end: date = Query(default=None, alias="to"),
):
    if date_end is None:
        date_end = date.today()
    if date_start is None:
        date_start = date_end - timedelta(days=29)

    # --- Daily breakdown (raw SQL for portability) ----------------------
    daily_q = text("""
        SELECT
            DATE(o.created_at)       AS sale_date,
            COUNT(DISTINCT o.id)     AS order_count,
            COALESCE(SUM(oi.subtotal), 0) AS total_revenue,
            COALESCE(SUM(oi.subtotal) * 1.0 / NULLIF(COUNT(DISTINCT o.id), 0), 0) AS avg_order_value,
            COUNT(DISTINCT o.table_id) AS tables_served,
            COALESCE(SUM(oi.quantity), 0) AS items_sold
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status != 'voided'
          AND DATE(o.created_at) >= :ds
          AND DATE(o.created_at) <= :de
        GROUP BY DATE(o.created_at)
        ORDER BY sale_date
    """)
    rows = (await db.execute(daily_q, {"ds": str(date_start), "de": str(date_end)})).mappings().all()

    daily = [
        DailySales(
            sale_date=r["sale_date"],
            order_count=int(r["order_count"]),
            total_revenue=round(float(r["total_revenue"]), 2),
            avg_order_value=round(float(r["avg_order_value"]), 2),
            tables_served=int(r["tables_served"]),
            items_sold=int(r["items_sold"]),
        )
        for r in rows
    ]

    # --- Top menu items -------------------------------------------------
    top_q = text("""
        SELECT
            oi.menu_item_id,
            mi.name AS item_name,
            SUM(oi.quantity)  AS total_quantity,
            SUM(oi.subtotal)  AS total_revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE o.status != 'voided'
          AND DATE(o.created_at) >= :ds
          AND DATE(o.created_at) <= :de
        GROUP BY oi.menu_item_id, mi.name
        ORDER BY total_quantity DESC
        LIMIT 10
    """)
    top_rows = (await db.execute(top_q, {"ds": str(date_start), "de": str(date_end)})).mappings().all()

    top_items = [
        TopMenuItem(
            menu_item_id=r["menu_item_id"],
            item_name=r["item_name"],
            total_quantity=int(r["total_quantity"]),
            total_revenue=round(float(r["total_revenue"]), 2),
        )
        for r in top_rows
    ]

    # --- Aggregates -----------------------------------------------------
    total_revenue = sum(d.total_revenue for d in daily)
    total_orders = sum(d.order_count for d in daily)
    total_items = sum(d.items_sold for d in daily)
    avg_val = round(total_revenue / total_orders, 2) if total_orders else 0

    return AnalyticsSummary(
        period_start=date_start,
        period_end=date_end,
        total_revenue=round(total_revenue, 2),
        total_orders=total_orders,
        avg_order_value=avg_val,
        total_items_sold=total_items,
        daily=daily,
        top_items=top_items,
    )


@router.post(
    "/refresh-view",
    dependencies=_admin,
    summary="Refresh the Postgres materialized view (no-op on SQLite)",
)
async def refresh_materialized_view(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary"))
        await db.commit()
        return {"status": "refreshed"}
    except Exception:
        return {"status": "skipped", "detail": "Materialized view may not exist (SQLite dev mode)"}
