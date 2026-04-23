"""Table management endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import RoleChecker, get_db
from app.models.table import Table

router = APIRouter()


@router.get("/")
async def list_tables(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Table))
    return result.scalars().all()


@router.post("/", dependencies=[Depends(RoleChecker(["admin"]))])
async def create_table(number: int, seats: int = 4, db: AsyncSession = Depends(get_db)):
    table = Table(number=number, seats=seats)
    db.add(table)
    await db.commit()
    await db.refresh(table)
    return table
