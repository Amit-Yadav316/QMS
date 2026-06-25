"""project-scoped model: project_members, contractor accept status, project_id on suppliers/labs/invites

Revision ID: e1c2d3e4f5a6
Revises: d8b2e3f4a5b6
Create Date: 2026-06-23 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1c2d3e4f5a6'
down_revision: Union[str, None] = 'd8b2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Generic user <-> project membership.
    op.create_table(
        "project_members",
        sa.Column("member_id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("org_id", sa.BigInteger(), nullable=False),
        sa.Column("project_role", sa.String(length=20), nullable=False),
        sa.Column("assigned_by", sa.BigInteger(), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["master.projects.project_id"]),
        sa.ForeignKeyConstraint(["user_id"], ["auth.users.user_id"]),
        sa.ForeignKeyConstraint(["org_id"], ["auth.organisations.org_id"]),
        sa.ForeignKeyConstraint(["assigned_by"], ["auth.users.user_id"]),
        sa.PrimaryKeyConstraint("member_id"),
        sa.UniqueConstraint("project_id", "user_id", name="uq_member_project_user"),
        schema="auth",
    )

    # 2. Contractor accept/decline on the project link.
    op.add_column(
        "project_contractors",
        sa.Column("status", sa.String(length=20), server_default="PENDING", nullable=False),
        schema="master",
    )
    op.add_column(
        "project_contractors",
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        schema="master",
    )

    # 3. Project scoping for suppliers / labs.
    op.add_column(
        "suppliers",
        sa.Column("project_id", sa.BigInteger(), nullable=True),
        schema="master",
    )
    op.create_foreign_key(
        "fk_suppliers_project", "suppliers", "projects",
        ["project_id"], ["project_id"],
        source_schema="master", referent_schema="master",
    )
    op.add_column(
        "testing_labs",
        sa.Column("project_id", sa.BigInteger(), nullable=True),
        schema="master",
    )
    op.create_foreign_key(
        "fk_labs_project", "testing_labs", "projects",
        ["project_id"], ["project_id"],
        source_schema="master", referent_schema="master",
    )

    # 4. Project assignment carried by an invitation.
    op.add_column(
        "org_invitations",
        sa.Column("project_id", sa.BigInteger(), nullable=True),
        schema="auth",
    )
    op.add_column(
        "org_invitations",
        sa.Column("project_role", sa.String(length=20), nullable=True),
        schema="auth",
    )
    op.create_foreign_key(
        "fk_invitations_project", "org_invitations", "projects",
        ["project_id"], ["project_id"],
        source_schema="auth", referent_schema="master",
    )


def downgrade() -> None:
    op.drop_constraint("fk_invitations_project", "org_invitations", schema="auth", type_="foreignkey")
    op.drop_column("org_invitations", "project_role", schema="auth")
    op.drop_column("org_invitations", "project_id", schema="auth")

    op.drop_constraint("fk_labs_project", "testing_labs", schema="master", type_="foreignkey")
    op.drop_column("testing_labs", "project_id", schema="master")
    op.drop_constraint("fk_suppliers_project", "suppliers", schema="master", type_="foreignkey")
    op.drop_column("suppliers", "project_id", schema="master")

    op.drop_column("project_contractors", "responded_at", schema="master")
    op.drop_column("project_contractors", "status", schema="master")

    op.drop_table("project_members", schema="auth")
