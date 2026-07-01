"""mix design submission PDF link

Adds master.mix_designs.document_id (FK -> master.documents): the mandatory PDF
the RMC attaches when submitting a mix design.

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-06-30 21:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f3a4b5c6d7e8"
down_revision: Union[str, None] = "e2f3a4b5c6d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "mix_designs",
        sa.Column("document_id", sa.BigInteger(), nullable=True),
        schema="master",
    )
    op.create_foreign_key(
        "fk_mix_designs_document",
        "mix_designs",
        "documents",
        ["document_id"],
        ["document_id"],
        source_schema="master",
        referent_schema="master",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_mix_designs_document", "mix_designs", schema="master", type_="foreignkey"
    )
    op.drop_column("mix_designs", "document_id", schema="master")
