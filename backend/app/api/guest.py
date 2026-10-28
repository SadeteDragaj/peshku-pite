"""Guest API used by the tablet on each table.

Tablets don't log in. Each table has a secret ``device_key``; the tablet sends it
in the ``X-Table-Key`` header with every table-scoped call.
"""

import hmac
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.inventory import consume_for_order
from app.api.tables import TabletSetup, _setup
from app.api.ws import manager as ws_manager
from app.core.config import settings
from app.core.deps import get_db
from app.models.menu import MenuCategory
from app.models.order import Order, OrderStatus
from app.models.service import Feedback, RequestKind, RequestStatus, ServiceRequest
from app.models.table import Table
from app.schemas.guest import (
    FeedbackCreate,
    GuestCategory,
    GuestTab,
    GuestTable,
    ServiceRequestCreate,
    ServiceRequestRead,
)
from app.schemas.order import OrderCreate, OrderItemCreate, OrderRead
from app.services.ordering import build_order_item, order_payload

router = APIRouter()


class GuestOrderCreate(OrderCreate):
    """Same as OrderCreate but the table comes from the URL, not the body."""

    table_id: str = ""
    items: list[OrderItemCreate]


async def table_from_key(
    number: int = Path(..., ge=1),
    x_table_key: str = Header(..., alias="X-Table-Key"),
    db: AsyncSession = Depends(get_db),
) -> Table:
    table = (await db.execute(select(Table).where(Table.number == number))).scalar_one_or_none()
    if table is None or not hmac.compare_digest(table.device_key, x_table_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown table or wrong table key")
    return table


# ===================================================================
# Menu (public)
# ===================================================================
@router.get("/demo/tables", response_model=list[TabletSetup], summary="Demo only: every table's tablet link")
async def demo_tables(db: AsyncSession = Depends(get_db)):
    if not settings.DEMO_MODE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    tables = (await db.execute(select(Table).order_by(Table.number))).scalars().all()
    return [_setup(t) for t in tables]


@router.get("/menu", response_model=list[GuestCategory], summary="Full menu for the tablet, incl. sold-out items")
async def guest_menu(db: AsyncSession = Depends(get_db)):
    cats = (await db.execute(select(MenuCategory).order_by(MenuCategory.sort_order))).scalars().all()
    result = []
    for c in cats:
        cat = GuestCategory.model_validate(c)
        cat.items = sorted(cat.items, key=lambda i: (i.sort_order, i.name))
        result.append(cat)
    return result


# ===================================================================
# Table-scoped
# ===================================================================
@router.get("/tables/{number}", response_model=GuestTable, summary="Check the tablet's key and get table info")
async def guest_table(table: Table = Depends(table_from_key)):
    return GuestTable(id=table.id, number=table.number, seats=table.seats, session_id=table.session_id)


@router.post(
    "/tables/{number}/orders",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Send an order from the table straight to the kitchen",
)
async def guest_place_order(
    body: GuestOrderCreate,
    table: Table = Depends(table_from_key),
    db: AsyncSession = Depends(get_db),
):
    if not body.items:
        raise HTTPException(status_code=400, detail="Order is empty")

    order = Order(
        table_id=table.id, session_id=table.session_id, waiter_id=table.assigned_waiter_id, notes=body.notes
    )
    for line in body.items:
        order.items.append(await build_order_item(line, db))

    table.occupied = True
    db.add(order)
    await db.flush()
    for line in body.items:
        await consume_for_order(order.id, line.menu_item_id, line.quantity, db)
    await db.commit()
    await db.refresh(order)

    await ws_manager.broadcast(
        {
            "event": "order_created",
            "order_id": order.id,
            "table_id": table.id,
            "table_number": table.number,
            "status": order.status,
            "order": order_payload(order),
        }
    )
    return order


@router.get("/tables/{number}/tab", response_model=GuestTab, summary="This table's orders and running total")
async def guest_tab(table: Table = Depends(table_from_key), db: AsyncSession = Depends(get_db)):
    orders = (
        (
            await db.execute(
                select(Order)
                .where(Order.table_id == table.id)
                .where(Order.session_id == table.session_id)
                .where(Order.status != OrderStatus.VOIDED)
                .order_by(Order.created_at)
            )
        )
        .scalars()
        .all()
    )
    total = round(sum(i.subtotal for o in orders for i in o.items), 2)
    return GuestTab(
        table_number=table.number,
        session_id=table.session_id,
        orders=[OrderRead.model_validate(o) for o in orders],
        total=total,
    )


@router.get("/tables/{number}/requests", response_model=list[ServiceRequestRead], summary="Open requests")
async def guest_open_requests(table: Table = Depends(table_from_key), db: AsyncSession = Depends(get_db)):
    rows = (
        (
            await db.execute(
                select(ServiceRequest)
                .where(ServiceRequest.table_id == table.id)
                .where(ServiceRequest.status == RequestStatus.OPEN)
                .order_by(ServiceRequest.created_at)
            )
        )
        .scalars()
        .all()
    )
    return rows


@router.post(
    "/tables/{number}/requests",
    response_model=ServiceRequestRead,
    status_code=status.HTTP_201_CREATED,
    summary="Call the waiter, ask for water, or request the bill",
)
async def guest_create_request(
    body: ServiceRequestCreate,
    table: Table = Depends(table_from_key),
    db: AsyncSession = Depends(get_db),
):
    if body.kind == RequestKind.BILL and not body.payment_method:
        raise HTTPException(status_code=400, detail="Choose cash or card")

    # One open request per kind – a second tap just returns the existing one
    existing = (
        await db.execute(
            select(ServiceRequest)
            .where(ServiceRequest.table_id == table.id)
            .where(ServiceRequest.kind == body.kind)
            .where(ServiceRequest.status == RequestStatus.OPEN)
        )
    ).scalar_one_or_none()
    if existing:
        if body.payment_method and existing.payment_method != body.payment_method:
            existing.payment_method = body.payment_method
            await db.commit()
            await db.refresh(existing)
        return existing

    req = ServiceRequest(
        table_id=table.id,
        session_id=table.session_id,
        kind=body.kind,
        payment_method=body.payment_method if body.kind == RequestKind.BILL else "",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    await ws_manager.broadcast(
        {
            "event": "service_request",
            "request": ServiceRequestRead.model_validate(req).model_dump(mode="json"),
        }
    )
    return req


@router.delete(
    "/tables/{number}/requests/{request_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel an open request (e.g. guest tapped 'call waiter' by mistake)",
)
async def guest_cancel_request(
    request_id: str,
    table: Table = Depends(table_from_key),
    db: AsyncSession = Depends(get_db),
):
    req = await db.get(ServiceRequest, request_id)
    if not req or req.table_id != table.id:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status == RequestStatus.OPEN:
        req.status = RequestStatus.CANCELLED
        req.resolved_at = datetime.now(timezone.utc)
        await db.commit()
        await ws_manager.broadcast({"event": "service_request_closed", "request_id": req.id, "table_id": table.id})


@router.post(
    "/tables/{number}/feedback",
    status_code=status.HTTP_201_CREATED,
    summary="Post-meal rating",
)
async def guest_feedback(
    body: FeedbackCreate,
    table: Table = Depends(table_from_key),
    db: AsyncSession = Depends(get_db),
):
    fb = Feedback(
        table_id=table.id, session_id=table.session_id, rating=body.rating, tags=body.tags, comment=body.comment.strip()
    )
    db.add(fb)
    await db.commit()
    return {"ok": True}
