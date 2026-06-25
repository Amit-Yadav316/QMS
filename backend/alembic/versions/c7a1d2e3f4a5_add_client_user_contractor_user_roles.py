"""add client_user and contractor_user roles

Revision ID: c7a1d2e3f4a5
Revises: b1f1a1c1d1e1
Create Date: 2026-06-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7a1d2e3f4a5'
down_revision: Union[str, None] = 'b1f1a1c1d1e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE auth.userrole ADD VALUE IF NOT EXISTS 'CLIENT_USER'")
    op.execute("ALTER TYPE auth.userrole ADD VALUE IF NOT EXISTS 'CONTRACTOR_USER'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values.
    # To rollback: recreate the type without CLIENT_USER / CONTRACTOR_USER.
    pass
