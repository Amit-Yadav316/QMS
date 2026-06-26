"""schemas/traceability.py — Phase 6 lineage DTOs.

Traceability is a lookup, not an aggregation: pick a cube sample (found by any
reference — sample / pour / NCR / challan / vehicle) and walk its bounded
foreign-key chain back to the pour, the trucks that supplied it, and the tests
and NCR it produced. ``TraceRecord`` is the search-result summary; ``TraceDetail``
is the full chain for one sample.
"""

from datetime import date

from pydantic import BaseModel


class TraceRecord(BaseModel):
    """One search hit — a cube sample with just enough context to list it."""

    sample_id: int
    sample_reference: str | None = None
    pour_id: int
    pour_reference: str | None = None
    cast_date: date
    tower_name: str | None = None
    floor_label: str | None = None
    component_type: str | None = None
    grade_name: str | None = None
    supplier_name: str | None = None
    # Worst result across this sample's tests + the NCR it raised, if any.
    result_status: str | None = None
    ncr_number: str | None = None


class TraceTest(BaseModel):
    test_id: int
    test_age_days: int
    test_date: date
    observed_strength_mpa: float
    required_strength_mpa: float
    result_status: str
    lab_name: str | None = None
    ncr_id: int | None = None
    ncr_number: str | None = None


class TraceTruck(BaseModel):
    dispatch_token_id: int
    vehicle_number: str | None = None
    driver_name: str | None = None
    batch_number: str | None = None
    challan_number: str | None = None
    volume_cum: float | None = None
    slump_at_plant_mm: float | None = None
    status: str
    supplier_name: str | None = None
    grade_name: str | None = None


class TraceDetail(BaseModel):
    """The full lineage chain for one cube sample."""

    # Cube sample
    sample_id: int
    sample_reference: str | None = None
    cast_date: date
    lab_name: str | None = None
    # Pour + location
    pour_id: int
    pour_reference: str | None = None
    pour_date: date
    volume_cum: float | None = None
    pour_status: str
    tower_name: str | None = None
    floor_label: str | None = None
    component_type: str | None = None
    grade_name: str | None = None
    supplier_name: str | None = None
    # Chain
    tests: list[TraceTest] = []
    trucks: list[TraceTruck] = []
