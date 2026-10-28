"""manager board: staff names & deactivation, waiter recorded on each order

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-27
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("full_name", sa.String(120), nullable=False, server_default=""))
        b.add_column(sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()))
    with op.batch_alter_table("orders") as b:
        b.add_column(sa.Column("waiter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True))
    op.create_index("ix_orders_waiter_id", "orders", ["waiter_id"])


def downgrade() -> None:
    op.drop_index("ix_orders_waiter_id", table_name="orders")
    with op.batch_alter_table("orders") as b:
        b.drop_column("waiter_id")
    with op.batch_alter_table("users") as b:
        b.drop_column("active")
        b.drop_column("full_name")
