"""guest tablet: menu extras, order item options, table keys & sessions, service requests, feedback

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-27
"""

import secrets
import uuid
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- menu ---
    op.add_column("menu_categories", sa.Column("name_en", sa.String(120), nullable=False, server_default=""))
    with op.batch_alter_table("menu_items") as b:
        b.add_column(sa.Column("name_en", sa.String(200), nullable=False, server_default=""))
        b.add_column(sa.Column("description_en", sa.Text(), nullable=False, server_default=""))
        b.add_column(sa.Column("is_popular", sa.Boolean(), nullable=False, server_default=sa.false()))
        b.add_column(sa.Column("is_signature", sa.Boolean(), nullable=False, server_default=sa.false()))
        b.add_column(sa.Column("is_alcoholic", sa.Boolean(), nullable=False, server_default=sa.false()))
        b.add_column(sa.Column("station", sa.String(20), nullable=False, server_default="kitchen"))
        b.add_column(sa.Column("sizes", sa.JSON(), nullable=False, server_default="[]"))
        b.add_column(sa.Column("addons", sa.JSON(), nullable=False, server_default="[]"))

    # --- tables: tablet key + current tab ---
    with op.batch_alter_table("tables") as b:
        b.add_column(sa.Column("device_key", sa.String(64), nullable=False, server_default=""))
        b.add_column(sa.Column("session_id", sa.String(36), nullable=False, server_default=""))
    conn = op.get_bind()
    for (table_id,) in conn.execute(sa.text("SELECT id FROM tables")).fetchall():
        conn.execute(
            sa.text("UPDATE tables SET device_key = :k, session_id = :s WHERE id = :id"),
            {"k": secrets.token_urlsafe(16), "s": str(uuid.uuid4()), "id": table_id},
        )

    # --- orders ---
    op.add_column("orders", sa.Column("session_id", sa.String(36), nullable=False, server_default=""))
    op.create_index("ix_orders_session_id", "orders", ["session_id"])
    with op.batch_alter_table("order_items") as b:
        b.add_column(sa.Column("name", sa.String(200), nullable=False, server_default=""))
        b.add_column(sa.Column("station", sa.String(20), nullable=False, server_default="kitchen"))
        b.add_column(sa.Column("size", sa.String(8), nullable=False, server_default=""))
        b.add_column(sa.Column("addons", sa.JSON(), nullable=False, server_default="[]"))

    # --- service requests & feedback ---
    op.create_table(
        "service_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("table_id", sa.String(36), sa.ForeignKey("tables.id"), nullable=False, index=True),
        sa.Column("session_id", sa.String(36), nullable=False, server_default=""),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("payment_method", sa.String(10), nullable=False, server_default=""),
        sa.Column("status", sa.String(20), nullable=False, server_default="open", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "feedback",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("table_id", sa.String(36), sa.ForeignKey("tables.id"), nullable=False, index=True),
        sa.Column("session_id", sa.String(36), nullable=False, server_default=""),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("comment", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("feedback")
    op.drop_table("service_requests")
    with op.batch_alter_table("order_items") as b:
        for c in ("addons", "size", "station", "name"):
            b.drop_column(c)
    op.drop_index("ix_orders_session_id", table_name="orders")
    op.drop_column("orders", "session_id")
    with op.batch_alter_table("tables") as b:
        b.drop_column("session_id")
        b.drop_column("device_key")
    with op.batch_alter_table("menu_items") as b:
        for c in (
            "addons",
            "sizes",
            "station",
            "is_alcoholic",
            "is_signature",
            "is_popular",
            "description_en",
            "name_en",
        ):
            b.drop_column(c)
    op.drop_column("menu_categories", "name_en")
