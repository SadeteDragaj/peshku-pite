"""Waiter-dashboard endpoints: table overview, transfer, split-bill, close order."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.ws import manager as ws_manager
from app.core.deps import RoleChecker, get_current_user, get_db
from app.core.security import Role
from app.models.order import Order, OrderItem, OrderStatus
from app.models.table import Table
from app.models.user import User
from app.schemas.waiter import (
    CloseOrderRequest,
    CloseOrderResponse,
    SplitBillRequest,
    SplitBillResponse,
    TableOverview,
    TransferTableRequest,
)
from app.schemas.order import OrderRead

router = APIRouter()

_waiter_staff = [Depends(RoleChecker([Role.WAITER, Role.ADMIN]))]


# ===================================================================
# GET /waiter/tables – table overview with occupancy & active orders
# ===================================================================
@router.get(
    "/tables",
    response_model=list[TableOverview],
    dependencies=_waiter_staff,
    summary="Table overview with occupancy & order status",
)
async def table_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    mine_only: bool = False,
):
    query = select(Table)
    if mine_only:
        query = query.where(Table.assigned_waiter_id == current_user.id)
    query = query.order_by(Table.number)

    tables = (await db.execute(query)).scalars().all()
    result: list[TableOverview] = []

    for t in tables:
        # Fetch active (non-terminal) orders for this table
        active = (
            await db.execute(
                select(Order)
                .where(Order.table_id == t.id)
                .where(Order.status.notin_([OrderStatus.SERVED, OrderStatus.VOIDED]))
                .order_by(Order.created_at)
            )
        ).scalars().all()

        total_pending = sum(
            item.subtotal for o in active for item in o.items
        )

        result.append(
            TableOverview(
                id=t.id,
                number=t.number,
                seats=t.seats,
                occupied=t.occupied,
                assigned_waiter_id=t.assigned_waiter_id,
                active_orders=[OrderRead.model_validate(o) for o in active],
                total_pending=round(total_pending, 2),
            )
        )

    return result


# ===================================================================
# POST /waiter/tables/{table_id}/transfer
# ===================================================================
@router.post(
    "/tables/{table_id}/transfer",
    response_model=TableOverview,
    dependencies=_waiter_staff,
    summary="Transfer a table to another waiter",
)
async def transfer_table(
    table_id: str,
    body: TransferTableRequest,
    db: AsyncSession = Depends(get_db),
):
    table = await db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    # Validate target waiter exists and is a waiter/admin
    target = await db.get(User, body.target_waiter_id)
    if not target or target.role not in (Role.WAITER, Role.ADMIN):
        raise HTTPException(status_code=400, detail="Target user is not a waiter")

    table.assigned_waiter_id = body.target_waiter_id
    await db.commit()
    await db.refresh(table)

    await ws_manager.broadcast({
        "event": "table_transferred",
        "table_id": table.id,
        "table_number": table.number,
        "new_waiter_id": body.target_waiter_id,
    })

    # Return updated overview for this table
    active = (
        await db.execute(
            select(Order)
            .where(Order.table_id == table.id)
            .where(Order.status.notin_([OrderStatus.SERVED, OrderStatus.VOIDED]))
        )
    ).scalars().all()

    return TableOverview(
        id=table.id,
        number=table.number,
        seats=table.seats,
        occupied=table.occupied,
        assigned_waiter_id=table.assigned_waiter_id,
        active_orders=[OrderRead.model_validate(o) for o in active],
        total_pending=round(sum(i.subtotal for o in active for i in o.items), 2),
    )


# ===================================================================
# POST /waiter/orders/{order_id}/split-bill
# ===================================================================
@router.post(
    "/orders/{order_id}/split-bill",
    response_model=SplitBillResponse,
    dependencies=_waiter_staff,
    summary="Split an order's bill into multiple sub-orders",
)
async def split_bill(
    order_id: str,
    body: SplitBillRequest,
    db: AsyncSession = Depends(get_db),
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status in (OrderStatus.VOIDED,):
        raise HTTPException(status_code=400, detail="Cannot split a voided order")

    # Validate all item IDs belong to this order
    order_item_ids = {item.id for item in order.items}
    all_requested = set()
    for group in body.splits:
        for item_id in group:
            if item_id not in order_item_ids:
                raise HTTPException(status_code=400, detail=f"Item {item_id} not in this order")
            if item_id in all_requested:
                raise HTTPException(status_code=400, detail=f"Item {item_id} appears in multiple groups")
            all_requested.add(item_id)

    if all_requested != order_item_ids:
        raise HTTPException(status_code=400, detail="All items must be assigned to exactly one group")

    # Create new sub-orders
    new_orders: list[Order] = []
    for group in body.splits:
        new_order = Order(table_id=order.table_id, notes=f"Split from #{order_id[:8]}", status=order.status)
        for item_id in group:
            orig = next(i for i in order.items if i.id == item_id)
            new_order.items.append(
                OrderItem(
                    menu_item_id=orig.menu_item_id,
                    quantity=orig.quantity,
                    unit_price=orig.unit_price,
                    subtotal=orig.subtotal,
                    special_instructions=orig.special_instructions,
                )
            )
        db.add(new_order)
        new_orders.append(new_order)

    # Void the original order
    order.status = OrderStatus.VOIDED
    order.notes = f"{order.notes} [split into {len(new_orders)} orders]".strip()
    await db.commit()

    for o in new_orders:
        await db.refresh(o)

    await ws_manager.broadcast({
        "event": "order_split",
        "original_order_id": order_id,
        "new_order_ids": [o.id for o in new_orders],
    })

    return SplitBillResponse(
        original_order_id=order_id,
        new_orders=[OrderRead.model_validate(o) for o in new_orders],
    )


# ===================================================================
# POST /waiter/orders/{order_id}/close
# ===================================================================
@router.post(
    "/orders/{order_id}/close",
    response_model=CloseOrderResponse,
    dependencies=_waiter_staff,
    summary="Close (serve) or void an order, free table if no active orders remain",
)
async def close_order(
    order_id: str,
    body: CloseOrderRequest,
    db: AsyncSession = Depends(get_db),
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status in (OrderStatus.SERVED, OrderStatus.VOIDED):
        raise HTTPException(status_code=400, detail="Order already closed")

    new_status = OrderStatus.VOIDED if body.void else OrderStatus.SERVED
    # Validate transition
    if new_status == OrderStatus.SERVED and order.status != OrderStatus.READY:
        raise HTTPException(status_code=400, detail="Can only serve orders that are ready")

    old_status = order.status
    order.status = new_status
    await db.commit()

    # Check if table can be freed
    remaining = (
        await db.execute(
            select(Order)
            .where(Order.table_id == order.table_id)
            .where(Order.status.notin_([OrderStatus.SERVED, OrderStatus.VOIDED]))
        )
    ).scalars().all()

    table_freed = False
    if len(remaining) == 0:
        table = await db.get(Table, order.table_id)
        if table and table.occupied:
            table.occupied = False
            table_freed = True
            await db.commit()

    await ws_manager.broadcast({
        "event": "order_closed",
        "order_id": order.id,
        "table_id": order.table_id,
        "old_status": old_status,
        "new_status": new_status,
        "table_freed": table_freed,
    })

    return CloseOrderResponse(
        order_id=order.id,
        new_status=new_status,
        table_freed=table_freed,
    )
