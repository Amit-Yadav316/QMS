"""phase1 master data extend

Adds the richer Project / Tower / Supplier / TestingLab columns captured by
the Project Master, RMC Supplier and Lab Registration forms.

Revision ID: b1f1a1c1d1e1
Revises: 51a3dda11f5f
Create Date: 2026-06-19 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b1f1a1c1d1e1'
down_revision: Union[str, None] = '51a3dda11f5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# projecttype enum lives in the master schema (matches SQLAlchemy's auto-name).
_PROJECT_TYPE_VALUES = ('RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'INFRASTRUCTURE')

# One instance creates the type; the column instance must NOT re-create it.
projecttype_create = postgresql.ENUM(
    *_PROJECT_TYPE_VALUES, name='projecttype', schema='master'
)
projecttype_col = postgresql.ENUM(
    *_PROJECT_TYPE_VALUES, name='projecttype', schema='master', create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    projecttype_create.create(bind, checkfirst=True)

    # ── projects ──────────────────────────────────────────────────────────
    op.add_column('projects', sa.Column('project_type', projecttype_col, nullable=True), schema='master')
    op.add_column('projects', sa.Column('gst_number', sa.String(length=20), nullable=True), schema='master')
    op.add_column('projects', sa.Column('address_line1', sa.String(length=300), nullable=True), schema='master')
    op.add_column('projects', sa.Column('address_line2', sa.String(length=300), nullable=True), schema='master')
    op.add_column('projects', sa.Column('city', sa.String(length=100), nullable=True), schema='master')
    op.add_column('projects', sa.Column('state', sa.String(length=100), nullable=True), schema='master')
    op.add_column('projects', sa.Column('pin_code', sa.String(length=20), nullable=True), schema='master')
    op.add_column('projects', sa.Column('geo_coordinates', sa.String(length=100), nullable=True), schema='master')
    op.add_column('projects', sa.Column('site_area_sqm', sa.Numeric(14, 2), nullable=True), schema='master')
    op.add_column('projects', sa.Column('end_date', sa.Date(), nullable=True), schema='master')
    op.add_column('projects', sa.Column('no_of_basements', sa.Integer(), nullable=True), schema='master')
    op.add_column('projects', sa.Column('max_floors', sa.Integer(), nullable=True), schema='master')
    op.add_column('projects', sa.Column('acceptance_criteria', sa.String(length=50), nullable=True), schema='master')
    op.add_column('projects', sa.Column('min_cube_samples', sa.String(length=100), nullable=True), schema='master')
    op.add_column('projects', sa.Column('early_test_age_days', sa.Integer(), nullable=True), schema='master')
    op.add_column('projects', sa.Column('mid_test_age_days', sa.Integer(), nullable=True), schema='master')
    op.add_column('projects', sa.Column('final_test_age_days', sa.Integer(), nullable=True), schema='master')
    op.add_column('projects', sa.Column('characteristic_strength_pct', sa.Numeric(5, 2), nullable=True), schema='master')
    op.add_column('projects', sa.Column('ncr_trigger', sa.String(length=300), nullable=True), schema='master')

    # ── towers ────────────────────────────────────────────────────────────
    op.add_column('towers', sa.Column('tower_type', sa.String(length=50), nullable=True), schema='master')
    op.add_column('towers', sa.Column('no_of_basements', sa.Integer(), nullable=True), schema='master')
    op.add_column('towers', sa.Column('floor_height_m', sa.Numeric(5, 2), nullable=True), schema='master')
    op.add_column('towers', sa.Column('start_label', sa.String(length=50), nullable=True), schema='master')
    op.add_column('towers', sa.Column('construction_start_date', sa.Date(), nullable=True), schema='master')

    # ── suppliers ─────────────────────────────────────────────────────────
    op.add_column('suppliers', sa.Column('plant_name', sa.String(length=200), nullable=True), schema='master')
    op.add_column('suppliers', sa.Column('gst_number', sa.String(length=20), nullable=True), schema='master')
    op.add_column('suppliers', sa.Column('pan_number', sa.String(length=20), nullable=True), schema='master')
    op.add_column('suppliers', sa.Column('transit_time_mins', sa.Integer(), nullable=True), schema='master')
    op.add_column('suppliers', sa.Column('primary_contact_name', sa.String(length=200), nullable=True), schema='master')
    op.add_column('suppliers', sa.Column('primary_contact_designation', sa.String(length=100), nullable=True), schema='master')
    op.add_column('suppliers', sa.Column('dispatch_manager_name', sa.String(length=200), nullable=True), schema='master')
    op.add_column('suppliers', sa.Column('dispatch_mobile', sa.String(length=20), nullable=True), schema='master')
    op.add_column('suppliers', sa.Column('plant_capacity_cum_hr', sa.Numeric(8, 2), nullable=True), schema='master')
    op.add_column('suppliers', sa.Column('no_transit_mixers', sa.Integer(), nullable=True), schema='master')
    op.add_column('suppliers', sa.Column('no_concrete_pumps', sa.Integer(), nullable=True), schema='master')
    op.add_column('suppliers', sa.Column('qms_certification', sa.String(length=50), nullable=True), schema='master')

    # ── testing_labs ──────────────────────────────────────────────────────
    op.add_column('testing_labs', sa.Column('registration_number', sa.String(length=100), nullable=True), schema='master')
    op.add_column('testing_labs', sa.Column('gst_number', sa.String(length=20), nullable=True), schema='master')
    op.add_column('testing_labs', sa.Column('address_line1', sa.String(length=300), nullable=True), schema='master')
    op.add_column('testing_labs', sa.Column('city', sa.String(length=100), nullable=True), schema='master')
    op.add_column('testing_labs', sa.Column('state', sa.String(length=100), nullable=True), schema='master')
    op.add_column('testing_labs', sa.Column('lab_manager_name', sa.String(length=200), nullable=True), schema='master')
    op.add_column('testing_labs', sa.Column('alternate_phone', sa.String(length=20), nullable=True), schema='master')
    op.add_column('testing_labs', sa.Column('nabl_accredited', sa.String(length=20), nullable=True), schema='master')
    op.add_column('testing_labs', sa.Column('nabl_certificate_no', sa.String(length=100), nullable=True), schema='master')
    op.add_column('testing_labs', sa.Column('nabl_expiry_date', sa.Date(), nullable=True), schema='master')
    op.add_column('testing_labs', sa.Column('ctm_calibration_status', sa.String(length=20), nullable=True), schema='master')
    op.add_column('testing_labs', sa.Column('ctm_calibration_expiry', sa.Date(), nullable=True), schema='master')
    op.add_column('testing_labs', sa.Column('ctm_capacity_kn', sa.Numeric(8, 2), nullable=True), schema='master')


def downgrade() -> None:
    for col in (
        'ctm_capacity_kn', 'ctm_calibration_expiry', 'ctm_calibration_status',
        'nabl_expiry_date', 'nabl_certificate_no', 'nabl_accredited',
        'alternate_phone', 'lab_manager_name', 'state', 'city',
        'address_line1', 'gst_number', 'registration_number',
    ):
        op.drop_column('testing_labs', col, schema='master')

    for col in (
        'qms_certification', 'no_concrete_pumps', 'no_transit_mixers',
        'plant_capacity_cum_hr', 'dispatch_mobile', 'dispatch_manager_name',
        'primary_contact_designation', 'primary_contact_name',
        'transit_time_mins', 'pan_number', 'gst_number', 'plant_name',
    ):
        op.drop_column('suppliers', col, schema='master')

    for col in (
        'construction_start_date', 'start_label', 'floor_height_m',
        'no_of_basements', 'tower_type',
    ):
        op.drop_column('towers', col, schema='master')

    for col in (
        'ncr_trigger', 'characteristic_strength_pct', 'final_test_age_days',
        'mid_test_age_days', 'early_test_age_days', 'min_cube_samples',
        'acceptance_criteria', 'max_floors', 'no_of_basements', 'end_date',
        'site_area_sqm', 'geo_coordinates', 'pin_code', 'state', 'city',
        'address_line2', 'address_line1', 'gst_number', 'project_type',
    ):
        op.drop_column('projects', col, schema='master')

    projecttype_create.drop(op.get_bind(), checkfirst=True)
