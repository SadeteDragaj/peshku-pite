"""Seed the Peshku i Pitë menu, tables 1–14 and dev staff accounts.

Run from backend/:   python -m app.seed
Safe to re-run: categories/items are matched by name and updated in place.

Prices are the placeholders from the brief – the owner confirms them in the menu manager.
price = 0 means "not priced yet": the item shows on the tablet but can't be ordered.
"""

import asyncio
import os

from sqlalchemy import select

import app.models  # noqa: F401
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import async_session, engine
from app.models.menu import MenuCategory, MenuItem, Station
from app.models.table import Table
from app.models.user import User

TARTAR = {"id": "tartar", "name": "Salcë tartar", "name_en": "Tartar sauce", "price": 0.49}
PICKLES = {"id": "pickles", "name": "Tranguj", "name_en": "Pickles", "price": 1.99}
PEPPERS = {"id": "peppers", "name": "Speca të pjekur", "name_en": "Roasted peppers", "price": 2.49}
FISH_ADDONS = [TARTAR, PICKLES, PEPPERS]


def sizes(codes: str, price: float) -> list[dict]:
    # TODO(owner): each size currently uses the same placeholder price
    return [{"code": c, "price": price} for c in codes.split()]


MENU: list[dict] = [
    {
        "name": "Peshku",
        "name_en": "Fish",
        "items": [
            dict(
                name="Pjata Solo – Peshk për Një Bark",
                name_en="Solo Plate – Fish for One Belly",
                description="Pjatë peshku për një person.",
                description_en="A fish plate for one.",
                price=4.99,
                sizes=sizes("S M", 4.99),
                addons=FISH_ADDONS,
                is_popular=True,
            ),
            dict(
                name="Pjata Solo – Kur Uria S'ka Fund",
                name_en="Solo Plate – When Hunger Never Ends",
                description="Pjatë e madhe peshku për një person.",
                description_en="A big fish plate for one.",
                price=10.99,
                sizes=sizes("L XL", 10.99),
                addons=FISH_ADDONS,
            ),
            dict(
                name="Duet i Lehtë – Për Dy që Ndajnë Shijen",
                name_en="Light Duet – For Two Who Share the Taste",
                description="Pjatë peshku për dy.",
                description_en="A fish plate for two.",
                price=12.99,
                sizes=sizes("S M", 12.99),
                addons=FISH_ADDONS,
            ),
            dict(
                name="Duet Plot Bark – Për Dy që Duan Me Hangër Mirë",
                name_en="Full-Belly Duet – For Two Who Eat Well",
                description="Pjatë e madhe peshku për dy.",
                description_en="A big fish plate for two.",
                price=19.99,
                sizes=sizes("L XL", 19.99),
                addons=FISH_ADDONS,
            ),
            dict(
                name="Tavë me Karkaleca",
                name_en="Shrimp Casserole",
                price=16.00,
                description="Karkaleca në tavë.",
                description_en="Shrimp baked in a clay dish.",
            ),
            dict(
                name="Sardele / Gilica",
                name_en="Sardines / Gilica",
                price=4.00,
                is_popular=True,
                description="Sardele të skuqura.",
                description_en="Fried sardines.",
            ),
            dict(name="Açuge e Marinuar 50g", name_en="Marinated Anchovies 50g", price=4.00),
            dict(name="Bomb Shells – Midhje të mbushura", name_en="Bomb Shells – Stuffed Mussels", price=9.90),
            dict(
                name="Qofte Merluci",
                name_en="Cod Balls",
                price=0,
                is_signature=True,  # TODO(owner): price
                description="Qofte merluci të shtëpisë.",
                description_en="House cod balls.",
            ),
        ],
    },
    {
        "name": "Burger & Sandwich",
        "name_en": "Burgers & Sandwiches",
        "items": [
            dict(
                name="SteakBurger NY Style",
                name_en="SteakBurger NY Style",
                price=5.00,
                description=(
                    "Bukë artizanale e thekur, mish viçi steakhouse, salcë tartar, "
                    "çedar i shkrirë, qepë të karamelizuara."
                ),
                description_en=(
                    "Toasted artisan bun, steakhouse-style ground beef, tartar sauce, "
                    "melted cheddar, caramelized onions."
                ),
            ),
            dict(name="Crunch Chicken Sandwich", name_en="Crunch Chicken Sandwich", price=4.00),
            dict(name="Tortilla Chicken Crunch", name_en="Tortilla Chicken Crunch", price=4.50, is_popular=True),
            dict(
                name="Pollo Rosso Chicken Parmigiano",
                name_en="Pollo Rosso Chicken Parmigiano",
                price=5.50,
                description="Gjoks pule në salcë të kuqe me speca dhe parmixhano të shkrirë.",
                description_en="Chicken breast in red sauce with peppers and melted parmigiano.",
            ),
            dict(
                name="Hotdog Viçi në Tavë",
                name_en="Baked Beef Hotdog",
                price=5.50,
                description="Suxhuk viçi pikant i pjekur në salcë domatesh me speca stinore dhe mocarelë.",
                description_en="Spicy beef sausage baked in tomato sauce with seasonal peppers and mozzarella.",
            ),
            dict(name="Stromboli Pepperoni & Cheese", name_en="Stromboli Pepperoni & Cheese", price=4.99),
            dict(
                name="Crispy Chicken Fingers",
                name_en="Crispy Chicken Fingers",
                price=7.00,
                description="Në panko, me sallatë patatesh dhe salcë.",
                description_en="Panko-crusted, with potato salad and sauce.",
            ),
        ],
    },
    {
        "name": "Tartine",
        "name_en": "Tartines",
        "items": [
            dict(name="Tartine 4 Stinët", name_en="Four Seasons Tartine", price=4.99),
            dict(name="Tartine Royale", name_en="Tartine Royale", price=5.99),
        ],
    },
    {
        "name": "Anësore & Meze",
        "name_en": "Mezze & Sides",
        "items": [
            dict(
                name="Sallatë Fshati",
                name_en="Village Salad",
                price=7.00,
                description="Perime të freskëta me djathë Sjenice.",
                description_en="Fresh vegetables with Sjenica cheese.",
            ),
            dict(
                name="Roasted Olives & Feta",
                name_en="Roasted Olives & Feta",
                price=4.90,
                description="Për 1–2 persona.",
                description_en="For 1–2 people.",
            ),
            dict(name="Sallatë Patatesh", name_en="Potato Salad", price=2.39, is_popular=True),
            dict(name="Speca të Pjekur", name_en="Roasted Peppers", price=2.49),
            dict(name="Tranguj", name_en="Pickles", price=1.99),
            dict(name="Salcë Tartar", name_en="Tartar Sauce", price=0.49),
        ],
    },
    {
        "name": "Pije",
        "name_en": "Drinks",
        "items": [
            # TODO(owner): drink prices
            dict(
                name="Tarani Sauvignon (gotë)",
                name_en="Tarani Sauvignon (glass)",
                price=0,
                is_alcoholic=True,
                station=Station.BAR,
            ),
            dict(name="Birrë", name_en="Beer", price=0, is_alcoholic=True, station=Station.BAR),
            dict(name="Pije freskuese / Energjike", name_en="Soft drinks / Energy", price=0, station=Station.BAR),
            dict(name="Limonadë e freskët", name_en="Fresh Lemonade", price=0, station=Station.BAR),
        ],
    },
    {
        "name": "Kokteje",
        "name_en": "Cocktails",
        "items": [
            dict(name=n, name_en=n, price=5.00, is_alcoholic=True, station=Station.BAR)
            for n in [
                "Gin Tonic",
                "Gin Fizz",
                "Aperol Spritz",
                "Mojito",
                "Vodka Sour",
                "Tequila Sunrise",
                "Cuba Libre",
                "Whiskey Cola",
            ]
        ],
    },
]

# Dish photos (from the restaurant's Wolt listing), served from frontend/public/menu/.
# Only fills dishes without a photo, so photos changed in the menu manager are kept.
PHOTOS = {
    "Pjata Solo – Peshk për Një Bark": "pjata-solo-s.jpg",
    "Pjata Solo – Kur Uria S'ka Fund": "pjata-big.jpg",
    "Duet i Lehtë – Për Dy që Ndajnë Shijen": "pjata-big.jpg",
    "Duet Plot Bark – Për Dy që Duan Me Hangër Mirë": "pjata-big.jpg",
    "Tavë me Karkaleca": "tave-karkaleca.jpg",
    "Sardele / Gilica": "sardele.jpg",
    "Açuge e Marinuar 50g": "acuge.jpg",
    "Bomb Shells – Midhje të mbushura": "bomb-shells.jpg",
    "SteakBurger NY Style": "steakburger.png",
    "Crunch Chicken Sandwich": "crunch-chicken-sandwich.jpg",
    "Tortilla Chicken Crunch": "tortilla-chicken.jpg",
    "Pollo Rosso Chicken Parmigiano": "pollo-rosso.jpg",
    "Hotdog Viçi në Tavë": "hotdog.jpg",
    "Stromboli Pepperoni & Cheese": "stromboli.jpg",
    "Tartine 4 Stinët": "tartine-4-stinet.png",
    "Tartine Royale": "tartine-royale.png",
    "Sallatë Fshati": "sallate-fshati.jpg",
    "Roasted Olives & Feta": "roasted-olives.jpg",
    "Sallatë Patatesh": "sallate-patatesh.jpg",
    "Speca të Pjekur": "speca.jpg",
    "Tranguj": "tranguj.jpg",
    "Salcë Tartar": "salce-tartar.jpg",
    "Tarani Sauvignon (gotë)": "tarani-sauvignon.jpg",
    "Birrë": "birre.jpg",
    "Pije freskuese / Energjike": "pije-freskuese.jpg",
    "Limonadë e freskët": "limonade.jpg",
    "Gin Tonic": "gin-tonic.jpg",
    "Gin Fizz": "gin-fizz.jpg",
    "Aperol Spritz": "aperol-spritz.jpg",
    "Mojito": "mojito.jpg",
    "Vodka Sour": "vodka-sour.jpg",
    "Tequila Sunrise": "tequila-sunrise.jpg",
    "Cuba Libre": "cuba-libre.jpg",
    "Whiskey Cola": "whiskey-cola.jpg",
}

DEV_STAFF = [
    ("admin@example.com", "admin", "Menaxheri"),
    ("kamarieri@example.com", "waiter", "Kamarieri"),
    ("kuzhina@example.com", "kitchen", "Kuzhina"),
]


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        for ci, cat_data in enumerate(MENU):
            cat = (
                await db.execute(select(MenuCategory).where(MenuCategory.name == cat_data["name"]))
            ).scalar_one_or_none()
            if cat is None:
                cat = MenuCategory(name=cat_data["name"])
                db.add(cat)
            cat.name_en = cat_data["name_en"]
            cat.sort_order = ci
            await db.flush()

            for ii, data in enumerate(cat_data["items"]):
                item = (
                    await db.execute(
                        select(MenuItem).where(MenuItem.category_id == cat.id, MenuItem.name == data["name"])
                    )
                ).scalar_one_or_none()
                if item is None:
                    item = MenuItem(category_id=cat.id, name=data["name"], price=data["price"])
                    db.add(item)
                for key, value in data.items():
                    setattr(item, key, value)
                item.sort_order = ii
                if not item.image_url and item.name in PHOTOS:
                    item.image_url = f"/menu/{PHOTOS[item.name]}"

        for n in range(1, 15):
            if (await db.execute(select(Table).where(Table.number == n))).scalar_one_or_none() is None:
                db.add(Table(number=n, seats=2 if n in (10, 11) else 4))

        password = os.environ.get("SEED_STAFF_PASSWORD", "ndrysho-kete")
        for email, role, name in DEV_STAFF:
            if (await db.execute(select(User).where(User.email == email))).scalar_one_or_none() is None:
                db.add(User(email=email, full_name=name, hashed_password=hash_password(password), role=role))

        await db.commit()

        tables = (await db.execute(select(Table).order_by(Table.number))).scalars().all()
        print("\nMenu, tables and staff seeded. Staff password:", password, "(set SEED_STAFF_PASSWORD to change)")
        print("\nOpen these once on each table's tablet (the key is then remembered):")
        for t in tables:
            print(f"  Tavolina {t.number:>2}:  http://localhost:5173/t/{t.number}?key={t.device_key}")


if __name__ == "__main__":
    asyncio.run(seed())
