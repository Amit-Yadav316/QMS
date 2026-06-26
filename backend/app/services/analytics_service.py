"""analytics_service.py — Phase 6 metrics layer (the single chokepoint).

Every aggregation the app shows goes through this service: one method per
metric bundle. Today each method runs a live ``GROUP BY`` against the
transactional tables (project-scoped, indexed). The deliberate seam: when
volumes demand it, only the *insides* of these methods change to read pre-
aggregated rollup tables — the method signatures, the response DTOs, the
routers, the frontend, and the future AI query layer all stay the same.

Rule of the house: no router or page writes its own aggregation SQL. It asks
the metrics service. That keeps the numbers consistent and the seam intact.

All metrics are scoped to a single project. Facts reach the project either
directly (``Pour.project_id``) or through their pour:

    cube_test → cube_sample → pour            (quality)
    ncr       → pour                          (NCRs)
    truck     → rmc_dispatch → link → pour    (dispatch / gate)
"""

from datetime import date

from sqlalchemy import case, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from app.models.master import Grade, Project, Supplier
from app.models.quality import NCR, CubeTest, NCRStatus, ResultStatus
from app.models.transaction import (
    CubeSample,
    Pour,
    PourDispatchLink,
    TruckDispatch,
    TruckStatus,
)
from app.schemas.analytics import (
    GradeTrendPoint,
    OverviewKpis,
    QualityAnalytics,
    ResultBreakdown,
    StrengthBucket,
    SupplierScore,
)

# Strength-distribution buckets (MPa), in display order.
_BUCKET_ORDER = ["<35", "35-40", "40-45", "45-50", "50-55", "55+"]


def _pct(numerator: int, denominator: int) -> float | None:
    """Percentage, or None when there's nothing to divide by."""
    if not denominator:
        return None
    return round(numerator / denominator * 100, 1)


def _passes(col) -> object:
    """SUM(1) over PASS rows — used for pass-rate numerators."""
    return func.sum(case((col == ResultStatus.PASS, 1), else_=0))


class AnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    # ── Public metric bundles ────────────────────────────────────────────────

    async def overview(self, project: Project) -> OverviewKpis:
        pid = project.project_id
        kpis = OverviewKpis()
        await self._pour_kpis(pid, kpis)
        await self._quality_kpis(pid, kpis)
        await self._ncr_kpis(pid, kpis)
        await self._dispatch_kpis(pid, kpis)
        return kpis

    async def quality(
        self,
        project: Project,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
        grade_id: int | None = None,
        supplier_id: int | None = None,
        tower_id: int | None = None,
    ) -> QualityAnalytics:
        conds = [Pour.project_id == project.project_id]
        if date_from is not None:
            conds.append(CubeTest.test_date >= date_from)
        if date_to is not None:
            conds.append(CubeTest.test_date <= date_to)
        if grade_id is not None:
            conds.append(Pour.grade_id == grade_id)
        if supplier_id is not None:
            conds.append(Pour.supplier_horizontal_id == supplier_id)
        if tower_id is not None:
            conds.append(Pour.tower_id == tower_id)

        return QualityAnalytics(
            grade_trend=await self._grade_trend(conds),
            strength_distribution=await self._strength_distribution(conds),
            result_breakdown=await self._result_breakdown(conds),
        )

    async def suppliers(self, project: Project) -> list[SupplierScore]:
        pid = project.project_id
        # Pour-side aggregates (count + volume) keyed by supplier.
        pour_rows = (
            await self.session.execute(
                select(
                    Pour.supplier_horizontal_id,
                    Supplier.supplier_name,
                    func.count(Pour.pour_id),
                    func.coalesce(func.sum(Pour.volume_cum), 0),
                )
                .join(Supplier, Supplier.supplier_id == Pour.supplier_horizontal_id)
                .where(Pour.project_id == pid)
                .group_by(Pour.supplier_horizontal_id, Supplier.supplier_name)
            )
        ).all()
        scores: dict[int, SupplierScore] = {
            sid: SupplierScore(
                supplier_id=sid,
                supplier_name=name,
                pour_count=pours,
                pour_volume_cum=float(vol),
            )
            for sid, name, pours, vol in pour_rows
        }

        # Quality aggregates (tests / pass / avg strength) keyed by supplier.
        test_rows = (
            await self.session.execute(
                self._ct_join(
                    Pour.supplier_horizontal_id,
                    func.count(CubeTest.test_id),
                    _passes(CubeTest.result_status),
                    func.avg(CubeTest.observed_strength_mpa),
                )
                .where(Pour.project_id == pid)
                .group_by(Pour.supplier_horizontal_id)
            )
        ).all()
        for sid, tests, passes, avg in test_rows:
            score = scores.get(sid)
            if score is None:
                continue
            score.test_count = tests
            score.pass_count = int(passes or 0)
            score.pass_rate_pct = _pct(int(passes or 0), tests)
            score.avg_strength_mpa = round(float(avg), 2) if avg is not None else None

        return sorted(scores.values(), key=lambda s: s.supplier_name)

    # ── Overview helpers ─────────────────────────────────────────────────────

    async def _pour_kpis(self, pid: int, kpis: OverviewKpis) -> None:
        count, volume = (
            await self.session.execute(
                select(
                    func.count(Pour.pour_id),
                    func.coalesce(func.sum(Pour.volume_cum), 0),
                ).where(Pour.project_id == pid)
            )
        ).one()
        kpis.pour_count = count
        kpis.pour_volume_cum = float(volume)

    async def _quality_kpis(self, pid: int, kpis: OverviewKpis) -> None:
        total, passes, fails, criticals, avg = (
            await self.session.execute(
                self._ct_join(
                    func.count(CubeTest.test_id),
                    _passes(CubeTest.result_status),
                    func.sum(case((CubeTest.result_status == ResultStatus.FAIL, 1), else_=0)),
                    func.sum(
                        case((CubeTest.result_status == ResultStatus.CRITICAL_FAILURE, 1), else_=0)
                    ),
                    func.avg(CubeTest.observed_strength_mpa),
                ).where(Pour.project_id == pid)
            )
        ).one()
        kpis.test_count = total or 0
        kpis.pass_count = int(passes or 0)
        kpis.fail_count = int(fails or 0)
        kpis.critical_count = int(criticals or 0)
        kpis.pass_rate_pct = _pct(kpis.pass_count, kpis.test_count)
        kpis.avg_strength_mpa = round(float(avg), 2) if avg is not None else None

    async def _ncr_kpis(self, pid: int, kpis: OverviewKpis) -> None:
        status_rows = (
            await self.session.execute(
                select(NCR.status, func.count(NCR.ncr_id))
                .join(Pour, Pour.pour_id == NCR.pour_id)
                .where(Pour.project_id == pid)
                .group_by(NCR.status)
            )
        ).all()
        by_status = {status: count for status, count in status_rows}
        kpis.ncr_open = by_status.get(NCRStatus.OPEN, 0)
        kpis.ncr_under_review = by_status.get(NCRStatus.UNDER_REVIEW, 0)
        kpis.ncr_closed = by_status.get(NCRStatus.CLOSED, 0)

        avg_days = (
            await self.session.execute(
                select(
                    func.avg(
                        func.extract("epoch", NCR.closed_at - NCR.raised_at) / 86400.0
                    )
                )
                .join(Pour, Pour.pour_id == NCR.pour_id)
                .where(Pour.project_id == pid, NCR.closed_at.isnot(None))
            )
        ).scalar()
        kpis.avg_days_to_close = round(float(avg_days), 1) if avg_days is not None else None

    async def _dispatch_kpis(self, pid: int, kpis: OverviewKpis) -> None:
        rows = (
            await self.session.execute(
                select(
                    TruckDispatch.status,
                    func.count(distinct(TruckDispatch.dispatch_token_id)),
                )
                .join(
                    PourDispatchLink,
                    PourDispatchLink.dispatch_id == TruckDispatch.dispatch_id,
                )
                .join(Pour, Pour.pour_id == PourDispatchLink.pour_id)
                .where(Pour.project_id == pid)
                .group_by(TruckDispatch.status)
            )
        ).all()
        by_status = {status: count for status, count in rows}
        kpis.truck_accepted = by_status.get(TruckStatus.ACCEPTED, 0)
        kpis.truck_rejected = by_status.get(TruckStatus.REJECTED, 0)
        kpis.truck_total = sum(by_status.values())
        # Acceptance rate = of the trucks the gate actually decided on.
        kpis.acceptance_pct = _pct(
            kpis.truck_accepted, kpis.truck_accepted + kpis.truck_rejected
        )

    # ── Quality-analytics helpers ────────────────────────────────────────────

    async def _grade_trend(self, conds: list) -> list[GradeTrendPoint]:
        period = func.to_char(CubeTest.test_date, "YYYY-MM")
        rows = (
            await self.session.execute(
                self._ct_join(
                    period.label("period"),
                    Grade.grade_name,
                    func.count(CubeTest.test_id),
                    _passes(CubeTest.result_status),
                )
                .join(Grade, Grade.grade_id == Pour.grade_id)
                .where(*conds)
                .group_by(period, Grade.grade_name)
                .order_by(period, Grade.grade_name)
            )
        ).all()
        return [
            GradeTrendPoint(
                period=p,
                grade_name=name,
                test_count=tests,
                pass_count=int(passes or 0),
                pass_rate_pct=_pct(int(passes or 0), tests),
            )
            for p, name, tests, passes in rows
        ]

    async def _strength_distribution(self, conds: list) -> list[StrengthBucket]:
        bucket = case(
            (CubeTest.observed_strength_mpa < 35, "<35"),
            (CubeTest.observed_strength_mpa < 40, "35-40"),
            (CubeTest.observed_strength_mpa < 45, "40-45"),
            (CubeTest.observed_strength_mpa < 50, "45-50"),
            (CubeTest.observed_strength_mpa < 55, "50-55"),
            else_="55+",
        )
        rows = (
            await self.session.execute(
                self._ct_join(bucket.label("bucket"), func.count(CubeTest.test_id))
                .where(*conds)
                .group_by(bucket)
            )
        ).all()
        counts = {label: count for label, count in rows}
        return [
            StrengthBucket(label=label, count=counts[label])
            for label in _BUCKET_ORDER
            if label in counts
        ]

    async def _result_breakdown(self, conds: list) -> list[ResultBreakdown]:
        rows = (
            await self.session.execute(
                self._ct_join(CubeTest.result_status, func.count(CubeTest.test_id))
                .where(*conds)
                .group_by(CubeTest.result_status)
            )
        ).all()
        return [ResultBreakdown(status=status.value, count=count) for status, count in rows]

    # ── Shared join ──────────────────────────────────────────────────────────

    def _ct_join(self, *columns) -> Select:
        """Select `columns` over cube_test → cube_sample → pour. The pour carries
        the project / grade / supplier / tower dimensions every quality metric
        slices by; callers add their own GROUP BY / WHERE."""
        return (
            select(*columns)
            .select_from(CubeTest)
            .join(CubeSample, CubeSample.sample_id == CubeTest.sample_id)
            .join(Pour, Pour.pour_id == CubeSample.pour_id)
        )
