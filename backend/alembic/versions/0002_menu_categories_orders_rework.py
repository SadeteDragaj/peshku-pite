"""add menu_categories, rework menu_items, orders, order_items

Revision ID: 0002
Revises: None
Create Date: 2026-04-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users (idempotent: create if not exists) ---
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(254), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="customer"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # --- tables ---
    op.create_table(
        "tables",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("number", sa.Integer(), unique=True, nullable=False),
        sa.Column("seats", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("occupied", sa.Boolean(), nullable=False, server_default="0"),
    )

    # --- menu_categories (NEW) ---
    op.create_table(
        "menu_categories",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(120), unique=True, nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # --- menu_items (reworked – now FK to menu_categories) ---
    op.create_table(
        "menu_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("category_id", sa.String(36), sa.ForeignKey("menu_categories.id"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("image_url", sa.String(500), nullable=False, server_default=""),
        sa.Column("available", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # --- orders (reworked – added notes, updated_at) ---
    op.create_table(
        "orders",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("table_id", sa.String(36), sa.ForeignKey("tables.id"), nullable=False, index=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # --- order_items (reworked – added unit_price, special_instructions) ---
    op.create_table(
        "order_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("order_id", sa.String(36), sa.ForeignKey("orders.id"), nullable=False, index=True),
        sa.Column("menu_item_id", sa.String(36), sa.ForeignKey("menu_items.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("subtotal", sa.Float(), nullable=False),
        sa.Column("special_instructions", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("menu_items")
    op.drop_table("menu_categories")
    op.drop_table("tables")
    op.drop_table("users")
