"""Inventory management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import RoleChecker, get_current_user, get_db
from app.core.security import Role
from app.models.inventory import (
    InventoryItem,
    InventoryTransaction,
    MenuItemIngredient,
    TransactionType,
)
from app.models.user import User
from app.schemas.inventory import (
    IngredientLinkCreate,
    IngredientLinkRead,
    InventoryItemCreate,
    InventoryItemRead,
    InventoryItemUpdate,
    TransactionCreate,
    TransactionRead,
)
from app.schemas.menu import PaginatedResponse

router = APIRouter()

_admin = [Depends(RoleChecker([Role.ADMIN]))]
_staff = [Depends(RoleChecker([Role.ADMIN, Role.KITCHEN, Role.WAITER]))]


# ===================================================================
# Inventory items CRUD
# ===================================================================
@router.post(
    "/items",
    response_model=InventoryItemRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=_admin,
    summary="Create an inventory item",
)
async def create_item(body: InventoryItemCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(InventoryItem).where(InventoryItem.name == body.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Item with this name already exists")

    item = InventoryItem(**body.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _to_read(item)


@router.get(
    "/items",
    response_model=PaginatedResponse[InventoryItemRead],
    dependencies=_staff,
    summary="List inventory items (paginated, filterable)",
)
async def list_items(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    low_stock_only: bool = False,
    search: str | None = None,
):
    base = select(InventoryItem)
    count_q = select(func.count(InventoryItem.id))

    if low_stock_only:
        base = base.where(InventoryItem.quantity_on_hand <= InventoryItem.low_stock_threshold)
        count_q = count_q.where(InventoryItem.quantity_on_hand <= InventoryItem.low_stock_threshold)
    if search:
        base = base.where(InventoryItem.name.ilike(f"%{search}%"))
        count_q = count_q.where(InventoryItem.name.ilike(f"%{search}%"))

    total = (await db.execute(count_q)).scalar() or 0
    pages = max(1, -(-total // page_size))
    rows = (
        await db.execute(
            base.order_by(InventoryItem.name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    return PaginatedResponse(
        items=[_to_read(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get(
    "/items/{item_id}",
    response_model=InventoryItemRead,
    dependencies=_staff,
)
async def get_item(item_id: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return _to_read(item)


@router.patch(
    "/items/{item_id}",
    response_model=InventoryItemRead,
    dependencies=_admin,
)
async def update_item(
    item_id: str, body: InventoryItemUpdate, db: AsyncSession = Depends(get_db)
):
    item = await db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return _to_read(item)


@router.delete("/items/{item_id}", status_code=204, dependencies=_admin)
async def delete_item(item_id: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    await db.delete(item)
    await db.commit()


# ===================================================================
# Stock adjustments (purchase, wastage, manual adjustment)
# ===================================================================
@router.post(
    "/transactions",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=_admin,
    summary="Record a stock transaction (purchase, wastage, adjustment)",
)
async def create_transaction(
    body: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = await db.get(InventoryItem, body.inventory_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    # For wastage/consumption the change should be negative
    change = body.quantity_change
    if body.transaction_type in (TransactionType.WASTAGE, TransactionType.CONSUMPTION):
        change = -abs(change)
    elif body.transaction_type == TransactionType.PURCHASE:
        change = abs(change)

    if item.quantity_on_hand + change < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    txn = InventoryTransaction(
        inventory_item_id=body.inventory_item_id,
        transaction_type=body.transaction_type,
        quantity_change=change,
        notes=body.notes,
        created_by=current_user.id,
    )
    item.quantity_on_hand += change
    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    return txn


@router.get(
    "/transactions",
    response_model=PaginatedResponse[TransactionRead],
    dependencies=_staff,
    summary="List transactions for an inventory item",
)
async def list_transactions(
    db: AsyncSession = Depends(get_db),
    inventory_item_id: str | None = None,
    transaction_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    base = select(InventoryTransaction)
    count_q = select(func.count(InventoryTransaction.id))

    if inventory_item_id:
        base = base.where(InventoryTransaction.inventory_item_id == inventory_item_id)
        count_q = count_q.where(InventoryTransaction.inventory_item_id == inventory_item_id)
    if transaction_type:
        base = base.where(InventoryTransaction.transaction_type == transaction_type)
        count_q = count_q.where(InventoryTransaction.transaction_type == transaction_type)

    total = (await db.execute(count_q)).scalar() or 0
    pages = max(1, -(-total // page_size))
    rows = (
        await db.execute(
            base.order_by(InventoryTransaction.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    return PaginatedResponse(items=rows, total=total, page=page, page_size=page_size, pages=pages)


# ===================================================================
# Ingredient linkage (recipe: MenuItem → InventoryItem)
# ===================================================================
@router.post(
    "/ingredients",
    response_model=IngredientLinkRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=_admin,
    summary="Link a menu item to an inventory ingredient",
)
async def link_ingredient(body: IngredientLinkCreate, db: AsyncSession = Depends(get_db)):
    link = MenuItemIngredient(**body.model_dump())
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


@router.get(
    "/ingredients/{menu_item_id}",
    response_model=list[IngredientLinkRead],
    dependencies=_staff,
    summary="Get ingredients for a menu item",
)
async def get_ingredients(menu_item_id: str, db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(MenuItemIngredient).where(MenuItemIngredient.menu_item_id == menu_item_id)
        )
    ).scalars().all()
    return rows


@router.delete("/ingredients/{link_id}", status_code=204, dependencies=_admin)
async def remove_ingredient_link(link_id: str, db: AsyncSession = Depends(get_db)):
    link = await db.get(MenuItemIngredient, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Ingredient link not found")
    await db.delete(link)
    await db.commit()


# ===================================================================
# Order consumption helper (called from orders.place_order)
# ===================================================================
async def consume_for_order(order_id: str, menu_item_id: str, quantity: int, db: AsyncSession):
    """Deduct inventory for a placed order line. Called externally."""
    links = (
        await db.execute(
            select(MenuItemIngredient).where(MenuItemIngredient.menu_item_id == menu_item_id)
        )
    ).scalars().all()

    for link in links:
        item = await db.get(InventoryItem, link.inventory_item_id)
        if not item:
            continue
        change = -(link.quantity_needed * quantity)
        if item.quantity_on_hand + change < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{item.name}' (need {abs(change)} {item.unit}, have {item.quantity_on_hand})",
            )
        item.quantity_on_hand += change
        db.add(
            InventoryTransaction(
                inventory_item_id=item.id,
                transaction_type=TransactionType.CONSUMPTION,
                quantity_change=change,
                notes=f"Order {order_id}",
                reference_order_id=order_id,
            )
        )


# ---------------------------------------------------------------------------
def _to_read(item: InventoryItem) -> InventoryItemRead:
    return InventoryItemRead(
        id=item.id,
        name=item.name,
        unit=item.unit,
        quantity_on_hand=item.quantity_on_hand,
        low_stock_threshold=item.low_stock_threshold,
        cost_per_unit=item.cost_per_unit,
        is_low_stock=item.quantity_on_hand <= item.low_stock_threshold,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )
