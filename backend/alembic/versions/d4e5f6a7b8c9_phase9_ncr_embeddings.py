"""phase 9 — NCR embeddings cache (AISuggestion / RAG)

Adds ``quality.ncr_embeddings``: a cached embedding per CLOSED NCR, used to
retrieve similar past resolved NCRs when suggesting a root cause / corrective
actions for a new failure. The vector is a plain ``double precision[]`` and
similarity is computed in Python — the per-project corpus is small, so this
deliberately avoids pgvector (the retrieval layer is swappable to pgvector
later without touching the API/DTOs). Mirrored on the SQLAlchemy model so the
test schema (create_all) gets it too.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-27 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ncr_embeddings",
        sa.Column("embedding_id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("ncr_id", sa.BigInteger(), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("dim", sa.Integer(), nullable=False),
        sa.Column("vector", sa.ARRAY(sa.Float()), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["ncr_id"], ["quality.ncrs.ncr_id"]),
        sa.PrimaryKeyConstraint("embedding_id"),
        schema="quality",
    )
    op.create_index(
        "idx_ncr_embedding_ncr",
        "ncr_embeddings",
        ["ncr_id"],
        unique=True,
        schema="quality",
    )


def downgrade() -> None:
    op.drop_index(
        "idx_ncr_embedding_ncr", table_name="ncr_embeddings", schema="quality"
    )
    op.drop_table("ncr_embeddings", schema="quality")
