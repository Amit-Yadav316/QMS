"""lab report token flow

Adds the columns for the passwordless lab cube-report submission flow:

  transaction.cube_samples
    + report_token          single long-lived token emailed to the lab
    + report_token_sent_at  when the report link was last sent
    + testing_started_on    day the lab establishes as start of testing
                            (anchors the 7/14/28-day milestone schedule)

  quality.cube_tests
    + report_document_id    FK → master.documents (the lab's uploaded PDF)

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-30 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cube_samples",
        sa.Column("report_token", sa.String(length=100), nullable=True),
        schema="transaction",
    )
    op.create_unique_constraint(
        "uq_cube_samples_report_token",
        "cube_samples",
        ["report_token"],
        schema="transaction",
    )
    op.add_column(
        "cube_samples",
        sa.Column("report_token_sent_at", sa.DateTime(timezone=True), nullable=True),
        schema="transaction",
    )
    op.add_column(
        "cube_samples",
        sa.Column("testing_started_on", sa.Date(), nullable=True),
        schema="transaction",
    )
    op.add_column(
        "cube_tests",
        sa.Column("report_document_id", sa.BigInteger(), nullable=True),
        schema="quality",
    )
    op.create_foreign_key(
        "fk_cube_tests_report_document",
        "cube_tests",
        "documents",
        ["report_document_id"],
        ["document_id"],
        source_schema="quality",
        referent_schema="master",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_cube_tests_report_document",
        "cube_tests",
        schema="quality",
        type_="foreignkey",
    )
    op.drop_column("cube_tests", "report_document_id", schema="quality")
    op.drop_column("cube_samples", "testing_started_on", schema="transaction")
    op.drop_column("cube_samples", "report_token_sent_at", schema="transaction")
    op.drop_constraint(
        "uq_cube_samples_report_token",
        "cube_samples",
        schema="transaction",
        type_="unique",
    )
    op.drop_column("cube_samples", "report_token", schema="transaction")
