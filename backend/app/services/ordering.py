"""Order-building logic shared by the staff and guest order endpoints.

Prices are always computed here from the menu – never trusted from the client.
"""

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.menu import MenuItem
from app.models.order import Order, OrderItem
from app.schemas.order import OrderItemCreate, OrderRead


async def build_order_item(line: OrderItemCreate, db: AsyncSession) -> OrderItem:
    menu_item = await db.get(MenuItem, line.menu_item_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail=f"Menu item {line.menu_item_id} not found")
    if not menu_item.available:
        raise HTTPException(status_code=400, detail=f"Menu item '{menu_item.name}' is not available")

    # Size: required when the item offers sizes, rejected when it doesn't
    sizes = {s["code"]: float(s["price"]) for s in (menu_item.sizes or [])}
    if sizes:
        if line.size not in sizes:
            raise HTTPException(status_code=400, detail=f"Choose a size for '{menu_item.name}': {sorted(sizes)}")
        unit_price = sizes[line.size]
    else:
        if line.size:
            raise HTTPException(status_code=400, detail=f"'{menu_item.name}' has no size options")
        unit_price = float(menu_item.price)

    if unit_price <= 0:
        raise HTTPException(status_code=400, detail=f"'{menu_item.name}' has no price set yet")

    # Add-ons
    offered = {a["id"]: a for a in (menu_item.addons or [])}
    chosen: list[dict] = []
    for addon_id in dict.fromkeys(line.addon_ids):  # de-duplicate, keep order
        addon = offered.get(addon_id)
        if not addon:
            raise HTTPException(status_code=400, detail=f"Add-on '{addon_id}' not offered for '{menu_item.name}'")
        chosen.append({"id": addon["id"], "name": addon["name"], "price": float(addon["price"])})
        unit_price += float(addon["price"])

    unit_price = round(unit_price, 2)
    return OrderItem(
        menu_item_id=menu_item.id,
        name=menu_item.name,
        station=menu_item.station,
        size=line.size,
        addons=chosen,
        quantity=line.quantity,
        unit_price=unit_price,
        subtotal=round(unit_price * line.quantity, 2),
        special_instructions=line.special_instructions.strip(),
    )


def order_payload(order: Order) -> dict:
    """JSON-safe order dict for WebSocket events."""
    return OrderRead.model_validate(order).model_dump(mode="json")
