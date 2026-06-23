"""add email_otps table

Revision ID: d8b2e3f4a5b6
Revises: c7a1d2e3f4a5
Create Date: 2026-06-23 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8b2e3f4a5b6'
down_revision: Union[str, None] = 'c7a1d2e3f4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_otps",
        sa.Column("otp_id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("purpose", sa.String(length=20), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["auth.users.user_id"]),
        sa.PrimaryKeyConstraint("otp_id"),
        schema="auth",
    )
    op.create_index(
        "ix_auth_email_otps_email", "email_otps", ["email"], schema="auth"
    )


def downgrade() -> None:
    op.drop_index("ix_auth_email_otps_email", table_name="email_otps", schema="auth")
    op.drop_table("email_otps", schema="auth")
