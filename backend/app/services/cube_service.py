"""cube_service.py — business logic for cube samples, tests, and auto-NCRs.

Flow:

  QE casts a cube sample from a pour ──▶ records a strength test against it ──▶
  the quality engine grades it PASS / FAIL / CRITICAL_FAILURE ──▶ a FAIL or
  CRITICAL_FAILURE auto-raises an NCR (open, awaiting the Phase 5 lifecycle).

Cube samples are scoped to a project through their pour; the repos join through
that chain. Responses carry denormalised display names (pour location, grade,
lab) so the cube-results table and NCR list render without extra lookups.
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import quality_engine
from app.core.exceptions import NotFoundError
from app.models.auth import User
from app.models.master import (
    Component,
    Floor,
    Grade,
    GradeThreshold,
    Project,
    TestingLab,
    Tower,
)
from app.models.quality import NCR, CubeTest, NCRStatus, ResultStatus
from app.models.transaction import CubeSample, Pour
from app.repositories.cube_repo import (
    CubeSampleRepository,
    CubeTestRepository,
    NCRRepository,
)
from app.repositories.pour_repo import PourRepository
from app.schemas.quality import (
    CubeSampleCreate,
    CubeSampleResponse,
    CubeTestCreate,
    CubeTestResponse,
    NCRResponse,
)

# A failing test grades to one of these — the engine's non-passing outcomes.
_FAILING = (ResultStatus.FAIL, ResultStatus.CRITICAL_FAILURE)


class CubeService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.samples = CubeSampleRepository(session)
        self.tests = CubeTestRepository(session)
        self.ncrs = NCRRepository(session)
        self.pours = PourRepository(session)

    # ── Samples ──────────────────────────────────────────────────────────────

    async def create_sample(
        self, project: Project, pour_id: int, data: CubeSampleCreate, user: User
    ) -> CubeSampleResponse:
        pour = await self.pours.get_in_project(pour_id, project.project_id)
        if not pour:
            raise NotFoundError("Pour")
        await self._validate_lab(data.lab_id, project.project_id)

        sample = await self.samples.add(
            CubeSample(
                pour_id=pour.pour_id,
                cast_by=user.user_id,
                **data.model_dump(),
            )
        )
        return await self._sample_response(sample, pour=pour)

    async def list_samples_for_pour(
        self, project: Project, pour_id: int
    ) -> list[CubeSampleResponse]:
        pour = await self.pours.get_in_project(pour_id, project.project_id)
        if not pour:
            raise NotFoundError("Pour")
        samples = await self.samples.list_for_pour(pour_id)
        ncr_map = await self._ncr_map_for_samples([s.sample_id for s in samples])
        return [await self._sample_response(s, pour=pour, ncr_map=ncr_map) for s in samples]

    async def list_samples_for_project(
        self, project: Project
    ) -> list[CubeSampleResponse]:
        samples = await self.samples.list_for_project(project.project_id)
        ncr_map = await self._ncr_map_for_samples([s.sample_id for s in samples])
        return [await self._sample_response(s, ncr_map=ncr_map) for s in samples]

    # ── Tests + auto-NCR ─────────────────────────────────────────────────────

    async def record_test(
        self, project: Project, sample_id: int, data: CubeTestCreate, user: User
    ) -> CubeTestResponse:
        sample = await self.samples.get_in_project(sample_id, project.project_id)
        if not sample:
            raise NotFoundError("Cube sample")
        await self._validate_lab(data.lab_id, project.project_id)

        pour = await self.session.get(Pour, sample.pour_id)
        grade = await self.session.get(Grade, pour.grade_id) if pour else None

        required = data.required_strength_mpa
        if required is None:
            threshold = await self._threshold_for(pour.grade_id, data.test_age_days)
            required = quality_engine.required_strength(
                grade.min_strength_mpa if grade else 0,
                data.test_age_days,
                threshold,
            )
        result = quality_engine.classify(data.observed_strength_mpa, required)

        test = await self.tests.add(
            CubeTest(
                sample_id=sample.sample_id,
                lab_id=data.lab_id,
                test_age_days=data.test_age_days,
                test_date=data.test_date,
                observed_strength_mpa=data.observed_strength_mpa,
                required_strength_mpa=required,
                result_status=result,
                tested_by=user.user_id,
                lab_report_reference=data.lab_report_reference,
            )
        )

        ncr = None
        if result in _FAILING:
            ncr = await self._raise_ncr(test, pour, user)

        return await self._test_response(test, ncr=ncr)

    # ── NCRs (read-only) ─────────────────────────────────────────────────────

    async def list_ncrs_for_project(self, project: Project) -> list[NCRResponse]:
        ncrs = await self.ncrs.list_for_project(project.project_id)
        return [await self._ncr_response(n) for n in ncrs]

    async def get_ncr(self, project: Project, ncr_id: int) -> NCRResponse:
        ncr = await self.ncrs.get_in_project(ncr_id, project.project_id)
        if not ncr:
            raise NotFoundError("NCR")
        return await self._ncr_response(ncr)

    # ── Internals ────────────────────────────────────────────────────────────

    async def _validate_lab(self, lab_id: int | None, project_id: int) -> None:
        if lab_id is None:
            return
        lab = await self.session.get(TestingLab, lab_id)
        if not lab or lab.project_id != project_id:
            raise NotFoundError("Lab")

    async def _threshold_for(
        self, grade_id: int, test_age_days: int
    ) -> float | None:
        res = await self.session.execute(
            select(GradeThreshold.min_strength_mpa).where(
                GradeThreshold.grade_id == grade_id,
                GradeThreshold.test_age_days == test_age_days,
            )
        )
        return res.scalar_one_or_none()

    async def _raise_ncr(self, test: CubeTest, pour: Pour, user: User) -> NCR:
        ncr = await self.ncrs.add(
            NCR(
                test_id=test.test_id,
                pour_id=pour.pour_id,
                status=NCRStatus.OPEN,
                raised_by=user.user_id,
            )
        )
        ncr.ncr_number = f"NCR-{date.today():%Y%m%d}-{ncr.ncr_id:04d}"
        await self.session.flush()
        return ncr

    async def _ncr_map_for_samples(self, sample_ids: list[int]) -> dict[int, NCR]:
        """{test_id: NCR} for every test belonging to the given samples."""
        if not sample_ids:
            return {}
        tests = await self.tests.list_for_samples(sample_ids)
        test_ids = [t.test_id for t in tests]
        if not test_ids:
            return {}
        res = await self.session.execute(select(NCR).where(NCR.test_id.in_(test_ids)))
        return {n.test_id: n for n in res.scalars().all()}

    async def _sample_response(
        self,
        sample: CubeSample,
        *,
        pour: Pour | None = None,
        ncr_map: dict[int, NCR] | None = None,
    ) -> CubeSampleResponse:
        if pour is None:
            pour = await self.session.get(Pour, sample.pour_id)
        tower = await self.session.get(Tower, pour.tower_id) if pour else None
        floor = await self.session.get(Floor, pour.floor_id) if pour else None
        component = await self.session.get(Component, pour.component_id) if pour else None
        grade = await self.session.get(Grade, pour.grade_id) if pour else None
        lab = await self.session.get(TestingLab, sample.lab_id) if sample.lab_id else None

        tests = await self.tests.list_for_sample(sample.sample_id)
        test_responses = [
            await self._test_response(
                t, ncr=ncr_map.get(t.test_id) if ncr_map is not None else None
            )
            for t in tests
        ]
        return CubeSampleResponse(
            sample_id=sample.sample_id,
            pour_id=sample.pour_id,
            sample_reference=sample.sample_reference,
            cast_date=sample.cast_date,
            no_of_cubes=sample.no_of_cubes,
            lab_id=sample.lab_id,
            lab_name=lab.lab_name if lab else None,
            lab_dispatch_date=sample.lab_dispatch_date,
            expected_result_date=sample.expected_result_date,
            lab_dispatch_notes=sample.lab_dispatch_notes,
            created_at=sample.created_at,
            pour_reference=pour.pour_reference if pour else None,
            tower_name=tower.tower_name if tower else None,
            floor_label=floor.floor_label if floor else None,
            component_type=component.component_type.value if component else None,
            grade_name=grade.grade_name if grade else None,
            grade_min_strength_mpa=grade.min_strength_mpa if grade else None,
            tests=test_responses,
        )

    async def _test_response(
        self, test: CubeTest, *, ncr: NCR | None = None
    ) -> CubeTestResponse:
        if ncr is None and test.result_status in _FAILING:
            res = await self.session.execute(
                select(NCR).where(NCR.test_id == test.test_id)
            )
            ncr = res.scalar_one_or_none()
        lab = await self.session.get(TestingLab, test.lab_id) if test.lab_id else None
        return CubeTestResponse(
            test_id=test.test_id,
            sample_id=test.sample_id,
            test_age_days=test.test_age_days,
            test_date=test.test_date,
            observed_strength_mpa=test.observed_strength_mpa,
            required_strength_mpa=test.required_strength_mpa,
            result_status=test.result_status,
            lab_id=test.lab_id,
            lab_name=lab.lab_name if lab else None,
            lab_report_reference=test.lab_report_reference,
            ncr_id=ncr.ncr_id if ncr else None,
            ncr_number=ncr.ncr_number if ncr else None,
            created_at=test.created_at,
        )

    async def _ncr_response(self, ncr: NCR) -> NCRResponse:
        test = await self.session.get(CubeTest, ncr.test_id)
        sample = await self.session.get(CubeSample, test.sample_id) if test else None
        pour = await self.session.get(Pour, ncr.pour_id)
        tower = await self.session.get(Tower, pour.tower_id) if pour else None
        floor = await self.session.get(Floor, pour.floor_id) if pour else None
        component = await self.session.get(Component, pour.component_id) if pour else None
        grade = await self.session.get(Grade, pour.grade_id) if pour else None
        return NCRResponse(
            ncr_id=ncr.ncr_id,
            ncr_number=ncr.ncr_number,
            test_id=ncr.test_id,
            pour_id=ncr.pour_id,
            status=ncr.status,
            root_cause=ncr.root_cause,
            raised_at=ncr.raised_at,
            closed_at=ncr.closed_at,
            result_status=test.result_status if test else None,
            observed_strength_mpa=test.observed_strength_mpa if test else None,
            required_strength_mpa=test.required_strength_mpa if test else None,
            test_age_days=test.test_age_days if test else None,
            sample_reference=sample.sample_reference if sample else None,
            grade_name=grade.grade_name if grade else None,
            tower_name=tower.tower_name if tower else None,
            floor_label=floor.floor_label if floor else None,
            component_type=component.component_type.value if component else None,
        )
