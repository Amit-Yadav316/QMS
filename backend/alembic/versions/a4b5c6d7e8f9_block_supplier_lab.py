"""block/unblock fields for suppliers + labs

Adds is_blocked / block_reason / blocked_by / blocked_at to master.suppliers and
master.testing_labs so a QE/PM/contractor can block an RMC or lab (with a reason)
from new use, and unblock later.

Revision ID: a4b5c6d7e8f9
Revises: f3a4b5c6d7e8
Create Date: 2026-07-01 09:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a4b5c6d7e8f9"
down_revision: Union[str, None] = "f3a4b5c6d7e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = ("suppliers", "testing_labs")


def upgrade() -> None:
    for table in _TABLES:
        op.add_column(
            table,
            sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default=sa.false()),
            schema="master",
        )
        op.add_column(table, sa.Column("block_reason", sa.Text(), nullable=True), schema="master")
        op.add_column(table, sa.Column("blocked_by", sa.BigInteger(), nullable=True), schema="master")
        op.add_column(
            table,
            sa.Column("blocked_at", sa.DateTime(timezone=True), nullable=True),
            schema="master",
        )
        op.create_foreign_key(
            f"fk_{table}_blocked_by",
            table,
            "users",
            ["blocked_by"],
            ["user_id"],
            source_schema="master",
            referent_schema="auth",
        )


def downgrade() -> None:
    for table in _TABLES:
        op.drop_constraint(f"fk_{table}_blocked_by", table, schema="master", type_="foreignkey")
        for col in ("blocked_at", "blocked_by", "block_reason", "is_blocked"):
            op.drop_column(table, col, schema="master")
