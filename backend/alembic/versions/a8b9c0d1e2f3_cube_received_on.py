"""cube sample received-at-lab date

Adds transaction.cube_samples.cube_received_on (DATE, nullable): the day the lab
physically received the cubes — a distinct point between casting and the testing
day the lab establishes, used by the lab-timestamp integrity checks.

Revision ID: a8b9c0d1e2f3
Revises: a1b2c3d4e5f6
Create Date: 2026-06-30 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a8b9c0d1e2f3"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cube_samples",
        sa.Column("cube_received_on", sa.Date(), nullable=True),
        schema="transaction",
    )


def downgrade() -> None:
    op.drop_column("cube_samples", "cube_received_on", schema="transaction")
