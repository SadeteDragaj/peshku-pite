"""Menu category & item CRUD endpoints with pagination."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import RoleChecker, get_db
from app.core.security import Role
from app.models.menu import MenuCategory, MenuItem
from app.schemas.menu import (
    MenuCategoryCreate,
    MenuCategoryRead,
    MenuCategoryReadWithItems,
    MenuCategoryUpdate,
    MenuItemCreate,
    MenuItemRead,
    MenuItemUpdate,
    PaginatedResponse,
)

router = APIRouter()

_admin_only = [Depends(RoleChecker([Role.ADMIN]))]


# ===================================================================
# Helpers
# ===================================================================
async def _paginate(db: AsyncSession, stmt, total_stmt, page: int, page_size: int):
    total = (await db.execute(total_stmt)).scalar() or 0
    pages = max(1, -(-total // page_size))  # ceil division
    result = await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))
    return result.scalars().all(), total, pages


# ===================================================================
# Categories
# ===================================================================
@router.get(
    "/categories",
    response_model=list[MenuCategoryRead],
    summary="List all menu categories",
)
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MenuCategory).order_by(MenuCategory.sort_order)
    )
    return result.scalars().all()


@router.post(
    "/categories",
    response_model=MenuCategoryRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=_admin_only,
    summary="Create a menu category",
)
async def create_category(body: MenuCategoryCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(MenuCategory).where(MenuCategory.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category name already exists")
    cat = MenuCategory(**body.model_dump())
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.get(
    "/categories/{category_id}",
    response_model=MenuCategoryReadWithItems,
    summary="Get a category with its items",
)
async def get_category(category_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuCategory).where(MenuCategory.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.patch(
    "/categories/{category_id}",
    response_model=MenuCategoryRead,
    dependencies=_admin_only,
    summary="Update a menu category",
)
async def update_category(
    category_id: str, body: MenuCategoryUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(MenuCategory).where(MenuCategory.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=_admin_only,
    summary="Delete a category (cascades to items)",
)
async def delete_category(category_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuCategory).where(MenuCategory.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(cat)
    await db.commit()


# ===================================================================
# Items
# ===================================================================
@router.get(
    "/items",
    response_model=PaginatedResponse[MenuItemRead],
    summary="List menu items (paginated, filterable)",
)
async def list_items(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: str | None = None,
    available: bool | None = None,
    q: str | None = None,
):
    base = select(MenuItem)
    count_base = select(func.count(MenuItem.id))

    if category_id:
        base = base.where(MenuItem.category_id == category_id)
        count_base = count_base.where(MenuItem.category_id == category_id)
    if available is not None:
        base = base.where(MenuItem.available == available)
        count_base = count_base.where(MenuItem.available == available)
    if q:
        like = f"%{q}%"
        base = base.where(MenuItem.name.ilike(like))
        count_base = count_base.where(MenuItem.name.ilike(like))

    base = base.order_by(MenuItem.sort_order, MenuItem.name)
    rows, total, pages = await _paginate(db, base, count_base, page, page_size)
    return PaginatedResponse(items=rows, total=total, page=page, page_size=page_size, pages=pages)


@router.post(
    "/items",
    response_model=MenuItemRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=_admin_only,
    summary="Create a menu item",
)
async def create_item(body: MenuItemCreate, db: AsyncSession = Depends(get_db)):
    # Validate category exists
    cat = await db.get(MenuCategory, body.category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    item = MenuItem(**body.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get(
    "/items/{item_id}",
    response_model=MenuItemRead,
    summary="Get a single menu item",
)
async def get_item(item_id: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item


@router.patch(
    "/items/{item_id}",
    response_model=MenuItemRead,
    dependencies=_admin_only,
    summary="Update a menu item",
)
async def update_item(
    item_id: str, body: MenuItemUpdate, db: AsyncSession = Depends(get_db)
):
    item = await db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    updates = body.model_dump(exclude_unset=True)
    if "category_id" in updates:
        cat = await db.get(MenuCategory, updates["category_id"])
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
    for field, value in updates.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=_admin_only,
    summary="Delete a menu item",
)
async def delete_item(item_id: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    await db.delete(item)
    await db.commit()
