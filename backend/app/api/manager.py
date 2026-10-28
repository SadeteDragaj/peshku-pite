"""Manager board: today's money, staff accounts, table → waiter assignment, guest reviews.

Admin only. "Today" is the restaurant's local business day (settings.RESTAURANT_TZ).
"""

from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.waiter import staff_name
from app.api.ws import manager as ws_manager
from app.core.config import settings
from app.core.deps import RoleChecker, get_db
from app.core.security import Role, hash_password
from app.models.order import Order, OrderStatus
from app.models.service import Feedback, RequestStatus, ServiceRequest
from app.models.table import Table
from app.models.user import User
from app.schemas.manager import (
    DaySummary,
    DayTotal,
    HourSales,
    ItemSales,
    ManagerTable,
    Review,
    ReviewsOverview,
    StaffCreate,
    StaffMember,
    StaffUpdate,
    TableAssignment,
    TagCount,
    WaiterSales,
)

router = APIRouter()

_admin = RoleChecker([Role.ADMIN])
_admin_only = [Depends(_admin)]

STAFF_ROLES = (Role.WAITER, Role.KITCHEN, Role.ADMIN)
OPEN_STATUSES = (OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY)


def _tz() -> ZoneInfo:
    return ZoneInfo(settings.RESTAURANT_TZ)


def _local_today() -> date:
    return datetime.now(_tz()).date()


def _day_bounds(start: date, days: int = 1) -> tuple[datetime, datetime]:
    """UTC instants for [start 00:00, start + days 00:00) in restaurant time."""
    lo = datetime.combine(start, time.min, tzinfo=_tz())
    hi = datetime.combine(start + timedelta(days=days), time.min, tzinfo=_tz())
    return lo.astimezone(timezone.utc), hi.astimezone(timezone.utc)


def _local(dt: datetime) -> datetime:
    # SQLite (tests) hands back naive UTC
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).astimezone(_tz())


def _order_total(o: Order) -> float:
    return sum(i.subtotal for i in o.items)


# ===================================================================
# Day summary – the money
# ===================================================================
@router.get("/summary", response_model=DaySummary, dependencies=_admin_only, summary="Sales and service for one day")
async def day_summary(
    day: date | None = Query(default=None, description="Local date, default today"),
    db: AsyncSession = Depends(get_db),
):
    day = day or _local_today()
    week_start = day - timedelta(days=6)
    lo, hi = _day_bounds(week_start, 7)
    week = (
        (await db.execute(select(Order).where(Order.created_at >= lo, Order.created_at < hi))).scalars().all()
    )

    per_day: dict[date, list[Order]] = defaultdict(list)
    for o in week:
        per_day[_local(o.created_at).date()].append(o)

    today = per_day.get(day, [])
    sold = [o for o in today if o.status != OrderStatus.VOIDED]
    voided = [o for o in today if o.status == OrderStatus.VOIDED]
    revenue = sum(_order_total(o) for o in sold)

    by_hour: dict[int, list[Order]] = defaultdict(list)
    for o in sold:
        by_hour[_local(o.created_at).hour].append(o)

    names = {u.id: staff_name(u) for u in (await db.execute(select(User))).scalars().all()}
    by_waiter: dict[str | None, list[Order]] = defaultdict(list)
    for o in sold:
        by_waiter[o.waiter_id].append(o)

    items: dict[str, list[float]] = defaultdict(lambda: [0, 0.0])
    for o in sold:
        for i in o.items:
            items[i.name][0] += i.quantity
            items[i.name][1] += i.subtotal

    open_orders = len(
        (await db.execute(select(Order.id).where(Order.status.in_(OPEN_STATUSES)))).all()
    )
    open_requests = len(
        (await db.execute(select(ServiceRequest.id).where(ServiceRequest.status == RequestStatus.OPEN))).all()
    )
    day_lo, day_hi = _day_bounds(day)
    ratings = (
        (await db.execute(select(Feedback.rating).where(Feedback.created_at >= day_lo, Feedback.created_at < day_hi)))
        .scalars()
        .all()
    )

    return DaySummary(
        day=day,
        revenue=round(revenue, 2),
        orders=len(sold),
        avg_order=round(revenue / len(sold), 2) if sold else 0.0,
        items_sold=sum(i.quantity for o in sold for i in o.items),
        tabs=len({(o.table_id, o.session_id) for o in sold}),
        voided_orders=len(voided),
        voided_value=round(sum(_order_total(o) for o in voided), 2),
        open_orders=open_orders,
        open_requests=open_requests,
        avg_rating=round(sum(ratings) / len(ratings), 2) if ratings else None,
        reviews=len(ratings),
        by_hour=[
            HourSales(hour=h, revenue=round(sum(_order_total(o) for o in os), 2), orders=len(os))
            for h, os in sorted(by_hour.items())
        ],
        by_waiter=sorted(
            (
                WaiterSales(
                    waiter_id=wid,
                    name=names.get(wid, "") if wid else "",
                    revenue=round(sum(_order_total(o) for o in os), 2),
                    orders=len(os),
                )
                for wid, os in by_waiter.items()
            ),
            key=lambda w: -w.revenue,
        ),
        top_items=[
            ItemSales(name=n, quantity=int(q), revenue=round(r, 2))
            for n, (q, r) in sorted(items.items(), key=lambda kv: (-kv[1][0], -kv[1][1]))[:8]
        ],
        last_7_days=[
            DayTotal(
                day=d,
                revenue=round(sum(_order_total(o) for o in per_day.get(d, []) if o.status != OrderStatus.VOIDED), 2),
                orders=sum(1 for o in per_day.get(d, []) if o.status != OrderStatus.VOIDED),
            )
            for d in (week_start + timedelta(days=n) for n in range(7))
        ],
    )


# ===================================================================
# Staff accounts
# ===================================================================
async def _staff_member(db: AsyncSession, user: User) -> StaffMember:
    numbers = (
        (await db.execute(select(Table.number).where(Table.assigned_waiter_id == user.id).order_by(Table.number)))
        .scalars()
        .all()
    )
    return StaffMember(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        active=user.active,
        created_at=user.created_at,
        table_numbers=list(numbers),
    )


async def _unassign_tables(db: AsyncSession, user_id: str) -> None:
    for t in (await db.execute(select(Table).where(Table.assigned_waiter_id == user_id))).scalars().all():
        t.assigned_waiter_id = None


@router.get("/staff", response_model=list[StaffMember], dependencies=_admin_only, summary="All staff accounts")
async def list_staff(db: AsyncSession = Depends(get_db)):
    users = (
        (await db.execute(select(User).where(User.role.in_(STAFF_ROLES)).order_by(User.created_at))).scalars().all()
    )
    return [await _staff_member(db, u) for u in users]


@router.post(
    "/staff",
    response_model=StaffMember,
    status_code=status.HTTP_201_CREATED,
    dependencies=_admin_only,
    summary="Add a waiter / kitchen / manager account",
)
async def create_staff(body: StaffCreate, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    if (await db.execute(select(User).where(User.email == email))).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=email, full_name=body.full_name.strip(), hashed_password=hash_password(body.password), role=body.role
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await _staff_member(db, user)


@router.patch("/staff/{user_id}", response_model=StaffMember, summary="Rename, change role, reset password, (re)activate")
async def update_staff(
    user_id: str,
    body: StaffUpdate,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(_admin),
):
    user = await db.get(User, user_id)
    if not user or user.role not in STAFF_ROLES:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if user.id == me.id and (body.active is False or (body.role and body.role != Role.ADMIN)):
        raise HTTPException(status_code=400, detail="You can't deactivate or demote yourself")

    if body.full_name is not None:
        user.full_name = body.full_name.strip()
    if body.password is not None:
        user.hashed_password = hash_password(body.password)
    if body.role is not None and body.role != user.role:
        user.role = body.role
        if body.role == Role.KITCHEN:
            await _unassign_tables(db, user.id)
    if body.active is not None:
        user.active = body.active
        if not body.active:
            await _unassign_tables(db, user.id)
    await db.commit()
    await db.refresh(user)
    await ws_manager.broadcast({"event": "staff_changed"})
    return await _staff_member(db, user)


@router.delete(
    "/staff/{user_id}",
    response_model=StaffMember,
    summary="Remove a staff member (deactivated: can't log in, tables unassigned, sales history kept)",
)
async def remove_staff(user_id: str, db: AsyncSession = Depends(get_db), me: User = Depends(_admin)):
    return await update_staff(user_id, StaffUpdate(active=False), db, me)


# ===================================================================
# Tables → waiter
# ===================================================================
@router.get("/tables", response_model=list[ManagerTable], dependencies=_admin_only, summary="Tables with their waiter")
async def manager_tables(db: AsyncSession = Depends(get_db)):
    tables = (await db.execute(select(Table).order_by(Table.number))).scalars().all()
    names = {u.id: staff_name(u) for u in (await db.execute(select(User))).scalars().all()}
    open_orders = (await db.execute(select(Order).where(Order.status.in_(OPEN_STATUSES)))).scalars().all()
    by_table: dict[str, list[Order]] = defaultdict(list)
    for o in open_orders:
        by_table[o.table_id].append(o)
    return [
        ManagerTable(
            id=t.id,
            number=t.number,
            seats=t.seats,
            occupied=t.occupied,
            assigned_waiter_id=t.assigned_waiter_id,
            assigned_waiter_name=names.get(t.assigned_waiter_id or "", ""),
            open_orders=len(by_table[t.id]),
            pending_total=round(sum(_order_total(o) for o in by_table[t.id]), 2),
        )
        for t in tables
    ]


@router.put(
    "/tables/{table_id}/waiter",
    response_model=ManagerTable,
    dependencies=_admin_only,
    summary="Assign a table to a waiter (null to unassign)",
)
async def assign_table(table_id: str, body: TableAssignment, db: AsyncSession = Depends(get_db)):
    table = await db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    name = ""
    if body.waiter_id:
        waiter = await db.get(User, body.waiter_id)
        if not waiter or not waiter.active or waiter.role not in (Role.WAITER, Role.ADMIN):
            raise HTTPException(status_code=400, detail="Not an active waiter")
        name = staff_name(waiter)
    table.assigned_waiter_id = body.waiter_id or None
    await db.commit()
    await ws_manager.broadcast(
        {
            "event": "table_transferred",
            "table_id": table.id,
            "table_number": table.number,
            "new_waiter_id": table.assigned_waiter_id,
        }
    )
    return ManagerTable(
        id=table.id,
        number=table.number,
        seats=table.seats,
        occupied=table.occupied,
        assigned_waiter_id=table.assigned_waiter_id,
        assigned_waiter_name=name,
    )


# ===================================================================
# Guest reviews
# ===================================================================
@router.get("/reviews", response_model=ReviewsOverview, dependencies=_admin_only, summary="Guest ratings and comments")
async def reviews(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    lo, _ = _day_bounds(_local_today() - timedelta(days=days - 1))
    rows = (
        (await db.execute(select(Feedback).where(Feedback.created_at >= lo).order_by(Feedback.created_at.desc())))
        .scalars()
        .all()
    )
    numbers = {t.id: t.number for t in (await db.execute(select(Table))).scalars().all()}
    dist = [0] * 5
    for f in rows:
        dist[min(max(f.rating, 1), 5) - 1] += 1
    tags = Counter(tag for f in rows for tag in f.tags)
    return ReviewsOverview(
        count=len(rows),
        average=round(sum(f.rating for f in rows) / len(rows), 2) if rows else None,
        distribution=dist,
        top_tags=[TagCount(tag=t, count=c) for t, c in tags.most_common(8)],
        reviews=[
            Review(
                id=f.id,
                table_number=numbers.get(f.table_id),
                rating=f.rating,
                tags=f.tags,
                comment=f.comment,
                created_at=f.created_at,
            )
            for f in rows
        ],
    )
