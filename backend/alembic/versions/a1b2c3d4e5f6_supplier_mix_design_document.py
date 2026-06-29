"""supplier mix-design document link

Adds master.suppliers.mix_design_document_id (FK → master.documents): the
mix-design PDF the contractor attaches from the project document store when
registering an RMC supplier.

Revision ID: a1b2c3d4e5f6
Revises: f6a7b8c9d0e1
Create Date: 2026-06-30 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "suppliers",
        sa.Column("mix_design_document_id", sa.BigInteger(), nullable=True),
        schema="master",
    )
    op.create_foreign_key(
        "fk_suppliers_mix_design_document",
        "suppliers",
        "documents",
        ["mix_design_document_id"],
        ["document_id"],
        source_schema="master",
        referent_schema="master",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_suppliers_mix_design_document",
        "suppliers",
        schema="master",
        type_="foreignkey",
    )
    op.drop_column("suppliers", "mix_design_document_id", schema="master")
