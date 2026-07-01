"""schemas/analytics.py — Phase 6 read-only analytics DTOs.

Shaped, denormalised metric bundles for the Overview + Analytics dashboards.
Everything here is computed deterministically by ``analytics_service`` (SQL /
maths) — that service is the single source of truth the dashboards read (and,
later, the AI query layer). Fields are additive by design: new metrics append,
they never restructure an existing bundle, so forms/columns can keep growing.
"""

from pydantic import BaseModel


class OverviewKpis(BaseModel):
    """Top-of-dashboard KPI bundle for one project (whole-project, unfiltered)."""

    # Pours
    pour_count: int = 0
    pour_volume_cum: float = 0.0
    # Quality (cube strength tests)
    test_count: int = 0
    pass_count: int = 0
    fail_count: int = 0
    critical_count: int = 0
    pass_rate_pct: float | None = None
    avg_strength_mpa: float | None = None
    # NCRs
    ncr_open: int = 0
    ncr_under_review: int = 0
    ncr_closed: int = 0
    avg_days_to_close: float | None = None
    # Dispatch / gate (trucks)
    truck_total: int = 0
    truck_accepted: int = 0
    truck_rejected: int = 0
    acceptance_pct: float | None = None


class GradeTrendPoint(BaseModel):
    period: str  # 'YYYY-MM'
    grade_name: str
    test_count: int
    pass_count: int
    pass_rate_pct: float | None = None


class StrengthBucket(BaseModel):
    label: str  # e.g. '<35', '35-40'
    count: int


class ResultBreakdown(BaseModel):
    status: str  # PASS / FAIL / CRITICAL_FAILURE / PENDING
    count: int


class QualityAnalytics(BaseModel):
    """Quality charts for the Analytics page, honouring the dimension filters."""

    grade_trend: list[GradeTrendPoint] = []
    strength_distribution: list[StrengthBucket] = []
    result_breakdown: list[ResultBreakdown] = []


class SupplierScore(BaseModel):
    supplier_id: int
    supplier_name: str
    pour_count: int = 0
    pour_volume_cum: float = 0.0
    test_count: int = 0
    pass_count: int = 0
    pass_rate_pct: float | None = None
    avg_strength_mpa: float | None = None


# ── Phase 5B: the four IS-456/10262 statistical charts (all filter-driven) ────


class RunPoint(BaseModel):
    """One individual 28-day result on the quality-control run chart."""

    test_date: str  # ISO date
    observed_mpa: float
    grade_name: str | None = None
    tower_name: str | None = None
    reference: str | None = None  # pour/sample reference


class RunChart(BaseModel):
    """Chronological individual results + IS-456 control lines. Control lines are
    populated only when the data is a single grade (one fck)."""

    points: list[RunPoint] = []
    grade_name: str | None = None
    fck: float | None = None
    individual_min: float | None = None  # fck − 3
    target_mean: float | None = None  # fck + 1.65·σ
    mean: float | None = None


class CurvePoint(BaseModel):
    x: float
    y: float


class DistributionCurve(BaseModel):
    """Normal distribution of the filtered strength dataset (IS-10262 basis)."""

    sample_count: int = 0
    mean: float | None = None
    std_dev: float | None = None
    fck: float | None = None
    curve: list[CurvePoint] = []  # sampled bell curve
    histogram: list[StrengthBucket] = []


class TargetMeanRow(BaseModel):
    grade_name: str
    fck: float
    target_mean: float  # fck + 1.65·σ
    actual_mean: float | None = None
    sample_count: int = 0


class TargetMeanChart(BaseModel):
    rows: list[TargetMeanRow] = []


class AgePoint(BaseModel):
    test_age_days: int
    observed_mpa: float
    required_mpa: float | None = None


class StrengthAgeChart(BaseModel):
    """Compressive strength vs age for a specific pour/element."""

    points: list[AgePoint] = []
    grade_name: str | None = None
    reference: str | None = None


class SupplierNcrCount(BaseModel):
    """NCRs raised against each supplier's pours, split by lifecycle + severity.

    ``open_count`` + ``closed_count`` = ``total`` (status is mutually exclusive);
    ``critical_count`` overlaps them — it counts the NCRs whose triggering cube
    test was a CRITICAL_FAILURE, regardless of whether they're open or closed.
    """

    supplier_id: int
    supplier_name: str
    open_count: int = 0
    closed_count: int = 0
    critical_count: int = 0
    total: int = 0
