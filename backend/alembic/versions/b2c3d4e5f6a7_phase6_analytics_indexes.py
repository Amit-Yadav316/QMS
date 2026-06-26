"""phase 6 — analytics + traceability indexes

Performance indexes for the Phase 6 metrics service (supplier scorecard,
grade trend, dispatch-acceptance group-bys) and the traceability search
(by sample / pour / NCR / challan / vehicle reference). Pure indexes — no
schema/data change, and they back the live-aggregation path today and the
rollup path later (the 6b seam).

Revision ID: b2c3d4e5f6a7
Revises: a7c9e1b2f3d4
Create Date: 2026-06-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a7c9e1b2f3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (index_name, table, [columns], schema)
_INDEXES = [
    ("idx_pours_project_supplier", "pours", ["project_id", "supplier_horizontal_id"], "transaction"),
    ("idx_pours_project_grade", "pours", ["project_id", "grade_id"], "transaction"),
    ("idx_pours_reference", "pours", ["pour_reference"], "transaction"),
    ("idx_truck_dispatch", "truck_dispatches", ["dispatch_id"], "transaction"),
    ("idx_truck_status", "truck_dispatches", ["status"], "transaction"),
    ("idx_truck_challan", "truck_dispatches", ["challan_number"], "transaction"),
    ("idx_truck_vehicle", "truck_dispatches", ["vehicle_number"], "transaction"),
    ("idx_pdl_pour", "pour_dispatch_links", ["pour_id"], "transaction"),
    ("idx_pdl_dispatch", "pour_dispatch_links", ["dispatch_id"], "transaction"),
    ("idx_cube_sample_reference", "cube_samples", ["sample_reference"], "transaction"),
    ("idx_ncr_number", "ncrs", ["ncr_number"], "quality"),
]


def upgrade() -> None:
    for name, table, cols, schema in _INDEXES:
        op.create_index(name, table, cols, schema=schema)


def downgrade() -> None:
    for name, table, _cols, schema in reversed(_INDEXES):
        op.drop_index(name, table_name=table, schema=schema)
