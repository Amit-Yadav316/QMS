"""document review workflow

Adds master.documents.{approval_status, rejection_reason, reviewed_by,
reviewed_at}: a QE or PM approves/rejects each uploaded document (PENDING on
upload). Used by the RMC mix-design PDF + lab report PDFs.

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-06-30 20:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column(
            "approval_status",
            sa.String(length=20),
            nullable=False,
            server_default="PENDING",
        ),
        schema="master",
    )
    op.add_column(
        "documents", sa.Column("rejection_reason", sa.Text(), nullable=True), schema="master"
    )
    op.add_column(
        "documents", sa.Column("reviewed_by", sa.BigInteger(), nullable=True), schema="master"
    )
    op.add_column(
        "documents",
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        schema="master",
    )
    op.create_foreign_key(
        "fk_documents_reviewed_by",
        "documents",
        "users",
        ["reviewed_by"],
        ["user_id"],
        source_schema="master",
        referent_schema="auth",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_documents_reviewed_by", "documents", schema="master", type_="foreignkey"
    )
    for col in ("reviewed_at", "reviewed_by", "rejection_reason", "approval_status"):
        op.drop_column("documents", col, schema="master")
