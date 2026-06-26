"""phase 7 — project document store

Adds ``master.documents``: metadata + storage key for files uploaded against a
project (drawings, certificates, registers). The blob itself lives in the
storage backend (local disk today, object store later); this table is the
metadata + access record. Mirrored on the SQLAlchemy model so the test schema
(create_all) gets it too.

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-26 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("document_id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.BigInteger(), nullable=False),
        sa.Column("document_type", sa.String(length=50), nullable=True),
        sa.Column("title", sa.String(length=300), nullable=True),
        sa.Column("original_filename", sa.String(length=300), nullable=False),
        sa.Column("stored_key", sa.String(length=500), nullable=False),
        sa.Column("content_type", sa.String(length=150), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("uploaded_by", sa.BigInteger(), nullable=True),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["master.projects.project_id"]),
        sa.ForeignKeyConstraint(["uploaded_by"], ["auth.users.user_id"]),
        sa.PrimaryKeyConstraint("document_id"),
        schema="master",
    )
    op.create_index(
        "idx_documents_project", "documents", ["project_id"], schema="master"
    )


def downgrade() -> None:
    op.drop_index("idx_documents_project", table_name="documents", schema="master")
    op.drop_table("documents", schema="master")
