"""
schemas/quality.py
------------------
Pydantic v2 request/response models for Phase 4 — cube samples, cube-strength
tests, and the NCRs auto-raised on a failing test.

A cube *sample* is cast on site from a pour (transaction schema); one or more
*tests* (7-day, 28-day, …) are recorded against it. The quality engine grades
each test PASS / FAIL / CRITICAL_FAILURE; a FAIL or CRITICAL_FAILURE auto-raises
an NCR. Responses carry denormalised display names so the cube-results table and
NCR list render without extra frontend lookups.
"""

from datetime import date, datetime

from pydantic import BaseModel

from app.models.quality import NCRStatus, ResultStatus

# ── Cube samples ─────────────────────────────────────────────────────────────


class CubeSampleCreate(BaseModel):
    """Site QE casts a set of cubes from a pour and sends them to a lab."""

    sample_reference: str | None = None
    cast_date: date
    no_of_cubes: int = 3
    lab_id: int | None = None
    lab_dispatch_date: date | None = None
    expected_result_date: date | None = None
    lab_dispatch_notes: str | None = None


# ── Cube tests ───────────────────────────────────────────────────────────────


class CubeTestCreate(BaseModel):
    """One strength result for a sample at a given age.

    ``required_strength_mpa`` is optional — when omitted the quality engine
    derives it from the pour's grade and the test age."""

    test_age_days: int
    test_date: date
    observed_strength_mpa: float
    required_strength_mpa: float | None = None
    lab_id: int | None = None
    lab_report_reference: str | None = None


class CubeTestResponse(BaseModel):
    test_id: int
    sample_id: int
    test_age_days: int
    test_date: date
    observed_strength_mpa: float
    required_strength_mpa: float
    result_status: ResultStatus
    lab_id: int | None = None
    lab_name: str | None = None
    lab_report_reference: str | None = None
    # Populated when this test auto-raised an NCR (FAIL / CRITICAL_FAILURE).
    ncr_id: int | None = None
    ncr_number: str | None = None
    created_at: datetime


class CubeSampleResponse(BaseModel):
    sample_id: int
    pour_id: int
    sample_reference: str | None = None
    cast_date: date
    no_of_cubes: int
    lab_id: int | None = None
    lab_name: str | None = None
    lab_dispatch_date: date | None = None
    expected_result_date: date | None = None
    lab_dispatch_notes: str | None = None
    created_at: datetime
    # Denormalised pour context for the cube-results table.
    pour_reference: str | None = None
    tower_name: str | None = None
    floor_label: str | None = None
    component_type: str | None = None
    grade_name: str | None = None
    grade_min_strength_mpa: float | None = None
    tests: list[CubeTestResponse] = []


# ── NCRs (read-only here; full lifecycle in Phase 5) ─────────────────────────


class NCRResponse(BaseModel):
    ncr_id: int
    ncr_number: str | None = None
    test_id: int
    pour_id: int
    status: NCRStatus
    root_cause: str | None = None
    raised_at: datetime
    closed_at: datetime | None = None
    # Denormalised context for the NCR list.
    result_status: ResultStatus | None = None
    observed_strength_mpa: float | None = None
    required_strength_mpa: float | None = None
    test_age_days: int | None = None
    sample_reference: str | None = None
    grade_name: str | None = None
    tower_name: str | None = None
    floor_label: str | None = None
    component_type: str | None = None
