"""Order CRUD endpoints with pagination and WebSocket event emission."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.ws import manager as ws_manager
from app.api.inventory import consume_for_order
from app.core.deps import RoleChecker, get_current_user, get_db
from app.core.security import Role
from app.models.menu import MenuItem
from app.models.order import Order, OrderItem, OrderStatus
from app.models.table import Table
from app.models.user import User
from app.schemas.menu import PaginatedResponse
from app.schemas.order import OrderCreate, OrderRead, OrderStatusUpdate

router = APIRouter()

_staff = [Depends(RoleChecker([Role.WAITER, Role.KITCHEN, Role.ADMIN]))]

# Valid state transitions: from → {to, …}
_TRANSITIONS: dict[str, set[str]] = {
    OrderStatus.PENDING: {OrderStatus.PREPARING, OrderStatus.VOIDED},
    OrderStatus.PREPARING: {OrderStatus.READY, OrderStatus.VOIDED},
    OrderStatus.READY: {OrderStatus.SERVED, OrderStatus.VOIDED},
    OrderStatus.SERVED: set(),  # terminal
    OrderStatus.VOIDED: set(),  # terminal
}


# ===================================================================
# POST /orders – place a new order
# ===================================================================
@router.post(
    "/",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Place a new order",
)
async def place_order(
    body: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate table exists
    table = await db.get(Table, body.table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    order = Order(table_id=body.table_id, notes=body.notes)

    for line in body.items:
        menu_item = await db.get(MenuItem, line.menu_item_id)
        if not menu_item:
            raise HTTPException(
                status_code=404, detail=f"Menu item {line.menu_item_id} not found"
            )
        if not menu_item.available:
            raise HTTPException(
                status_code=400,
                detail=f"Menu item '{menu_item.name}' is not available",
            )
        order.items.append(
            OrderItem(
                menu_item_id=line.menu_item_id,
                quantity=line.quantity,
                unit_price=menu_item.price,
                subtotal=menu_item.price * line.quantity,
                special_instructions=line.special_instructions,
            )
        )

    db.add(order)
    await db.flush()  # get order.id for inventory refs

    # Deduct inventory for each line item (no-op if no ingredients linked)
    for line in body.items:
        await consume_for_order(order.id, line.menu_item_id, line.quantity, db)

    await db.commit()
    await db.refresh(order)

    # Broadcast new-order event via WebSocket
    await ws_manager.broadcast(
        {"event": "order_created", "order_id": order.id, "table_id": order.table_id, "status": order.status}
    )
    return order


# ===================================================================
# GET /orders – list orders (paginated, filterable)
# ===================================================================
@router.get(
    "/",
    response_model=PaginatedResponse[OrderRead],
    dependencies=_staff,
    summary="List orders (paginated)",
)
async def list_orders(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    table_id: str | None = None,
    order_status: str | None = Query(None, alias="status"),
):
    base = select(Order)
    count_base = select(func.count(Order.id))

    if table_id:
        base = base.where(Order.table_id == table_id)
        count_base = count_base.where(Order.table_id == table_id)
    if order_status:
        base = base.where(Order.status == order_status)
        count_base = count_base.where(Order.status == order_status)

    base = base.order_by(Order.created_at.desc())

    total = (await db.execute(count_base)).scalar() or 0
    pages = max(1, -(-total // page_size))
    result = await db.execute(base.offset((page - 1) * page_size).limit(page_size))
    rows = result.scalars().all()

    return PaginatedResponse(items=rows, total=total, page=page, page_size=page_size, pages=pages)


# ===================================================================
# GET /orders/{order_id}
# ===================================================================
@router.get(
    "/{order_id}",
    response_model=OrderRead,
    summary="Get order details",
)
async def get_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# ===================================================================
# PATCH /orders/{order_id}/status – update order status
# ===================================================================
@router.patch(
    "/{order_id}/status",
    response_model=OrderRead,
    dependencies=_staff,
    summary="Update order status (with transition validation)",
)
async def update_order_status(
    order_id: str,
    body: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    allowed_next = _TRANSITIONS.get(order.status, set())
    if body.status not in allowed_next:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{order.status}' to '{body.status}'. Allowed: {sorted(allowed_next) or 'none (terminal)'}",
        )

    old_status = order.status
    order.status = body.status
    await db.commit()
    await db.refresh(order)

    # Broadcast status-change event via WebSocket
    await ws_manager.broadcast(
        {
            "event": "order_status_changed",
            "order_id": order.id,
            "table_id": order.table_id,
            "old_status": old_status,
            "new_status": order.status,
        }
    )
    return order
    return {"id": order.id, "status": order.status}
