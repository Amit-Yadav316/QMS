"""drop the unused audit_logs trail

The audit-log trail was never wired up (no audit_service ever wrote to it) and
the user-facing "Audits" section was a static mockup — both removed. The ``audit``
schema stays for ingestion_logs + embeddings (RAG).

Revision ID: d1e2f3a4b5c6
Revises: c0d1e2f3a4b5
Create Date: 2026-06-30 19:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "c0d1e2f3a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("audit_logs", schema="audit")
    op.execute("DROP TYPE IF EXISTS audit.auditaction")


def downgrade() -> None:
    action = sa.Enum("CREATE", "UPDATE", "DELETE", name="auditaction", schema="audit")
    action.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "audit_logs",
        sa.Column("log_id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=True),
        sa.Column("action", action, nullable=False),
        sa.Column("table_name", sa.String(length=100), nullable=False),
        sa.Column("record_id", sa.String(length=50), nullable=False),
        sa.Column("old_values_json", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column("new_values_json", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column("logged_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["auth.users.user_id"]),
        sa.PrimaryKeyConstraint("log_id"),
        schema="audit",
    )
