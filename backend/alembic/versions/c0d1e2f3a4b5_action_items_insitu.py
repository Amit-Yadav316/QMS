"""mismatch action items + in-situ slump gate (Phase 4B)

- transaction.truckstatus += PENDING_QE (supervisor admitted; awaiting QE in-situ)
- new transaction.action_items (supervisor-raised mismatch → QE inbox)
- new transaction.insitu_tests (QE slump-cone check gating final acceptance)

Revision ID: c0d1e2f3a4b5
Revises: b9c0d1e2f3a4
Create Date: 2026-06-30 18:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c0d1e2f3a4b5"
down_revision: Union[str, None] = "b9c0d1e2f3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TYPE transaction.truckstatus ADD VALUE IF NOT EXISTS 'PENDING_QE' "
        "AFTER 'ARRIVED'"
    )

    action_reason = sa.Enum(
        "GRADE_MISMATCH", "SLUMP_MISMATCH", "VOLUME_MISMATCH", "OTHER",
        name="actionreason", schema="transaction",
    )
    action_status = sa.Enum(
        "OPEN", "RESOLVED", name="actionitemstatus", schema="transaction"
    )
    action_resolution = sa.Enum(
        "APPROVED", "REJECTED", name="actionresolution", schema="transaction"
    )
    insitu_result = sa.Enum(
        "PASS", "FAIL", name="insituresult", schema="transaction"
    )

    op.create_table(
        "action_items",
        sa.Column("action_item_id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.BigInteger(), nullable=False),
        sa.Column("dispatch_id", sa.BigInteger(), nullable=False),
        sa.Column("reason", action_reason, nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", action_status, nullable=False),
        sa.Column("resolution", action_resolution, nullable=True),
        sa.Column("raised_by", sa.BigInteger(), nullable=True),
        sa.Column("resolved_by", sa.BigInteger(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["master.projects.project_id"]),
        sa.ForeignKeyConstraint(["dispatch_id"], ["transaction.rmc_dispatches.dispatch_id"]),
        sa.ForeignKeyConstraint(["raised_by"], ["auth.users.user_id"]),
        sa.ForeignKeyConstraint(["resolved_by"], ["auth.users.user_id"]),
        sa.PrimaryKeyConstraint("action_item_id"),
        schema="transaction",
    )
    op.create_index(
        "idx_action_items_project_status", "action_items",
        ["project_id", "status"], schema="transaction",
    )
    op.create_index(
        "idx_action_items_dispatch", "action_items", ["dispatch_id"], schema="transaction",
    )

    op.create_table(
        "insitu_tests",
        sa.Column("insitu_test_id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("dispatch_id", sa.BigInteger(), nullable=False),
        sa.Column("target_slump_mm", sa.String(length=30), nullable=True),
        sa.Column("measured_slump_mm", sa.Numeric(6, 1), nullable=False),
        sa.Column("result", insitu_result, nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("tested_by", sa.BigInteger(), nullable=True),
        sa.Column("tested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["dispatch_id"], ["transaction.rmc_dispatches.dispatch_id"]),
        sa.ForeignKeyConstraint(["tested_by"], ["auth.users.user_id"]),
        sa.PrimaryKeyConstraint("insitu_test_id"),
        schema="transaction",
    )
    op.create_index(
        "idx_insitu_dispatch", "insitu_tests", ["dispatch_id"], schema="transaction",
    )


def downgrade() -> None:
    op.drop_table("insitu_tests", schema="transaction")
    op.drop_table("action_items", schema="transaction")
    for name in ("insituresult", "actionresolution", "actionitemstatus", "actionreason"):
        op.execute(f"DROP TYPE IF EXISTS transaction.{name}")
    # PENDING_QE stays in truckstatus (Postgres can't drop an enum value).
