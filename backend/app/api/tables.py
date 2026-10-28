"""Table management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import RoleChecker, get_db
from app.models.table import Table, new_device_key

router = APIRouter()

_admin_only = [Depends(RoleChecker(["admin"]))]


class TableRead(BaseModel):
    id: str
    number: int
    seats: int
    occupied: bool
    assigned_waiter_id: str | None = None

    model_config = {"from_attributes": True}


class TabletSetup(BaseModel):
    number: int
    device_key: str
    tablet_path: str  # open this on the table's tablet once; the key is then remembered


def _setup(table: Table) -> TabletSetup:
    return TabletSetup(
        number=table.number,
        device_key=table.device_key,
        tablet_path=f"/t/{table.number}?key={table.device_key}",
    )


@router.get("/", response_model=list[TableRead])
async def list_tables(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Table).order_by(Table.number))
    return result.scalars().all()


@router.post("/", response_model=TableRead, dependencies=_admin_only)
async def create_table(number: int, seats: int = 4, db: AsyncSession = Depends(get_db)):
    table = Table(number=number, seats=seats)
    db.add(table)
    await db.commit()
    await db.refresh(table)
    return table


@router.get("/tablets", response_model=list[TabletSetup], dependencies=_admin_only, summary="Tablet setup links")
async def tablet_links(db: AsyncSession = Depends(get_db)):
    tables = (await db.execute(select(Table).order_by(Table.number))).scalars().all()
    return [_setup(t) for t in tables]


@router.post(
    "/{table_id}/rotate-key",
    response_model=TabletSetup,
    dependencies=_admin_only,
    summary="Issue a new tablet key (the old tablet stops working)",
)
async def rotate_key(table_id: str, db: AsyncSession = Depends(get_db)):
    table = await db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    table.device_key = new_device_key()
    await db.commit()
    return _setup(table)
