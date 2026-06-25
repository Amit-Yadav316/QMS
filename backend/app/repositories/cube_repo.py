"""cube_repo.py — DB queries for cube samples, cube tests, and NCRs.

A cube sample lives in the transaction schema and is scoped to a project through
its pour (CubeSample → Pour → project_id); cube tests and NCRs hang off the
sample/pour, so the project-scoped queries here join through that chain.
"""

from sqlalchemy import select

from app.models.quality import NCR, CubeTest
from app.models.transaction import CubeSample, Pour
from app.repositories.base_repo import BaseRepository


class CubeSampleRepository(BaseRepository[CubeSample]):
    model = CubeSample

    async def get_in_project(
        self, sample_id: int, project_id: int
    ) -> CubeSample | None:
        q = (
            select(CubeSample)
            .join(Pour, Pour.pour_id == CubeSample.pour_id)
            .where(
                CubeSample.sample_id == sample_id,
                Pour.project_id == project_id,
            )
        )
        res = await self.session.execute(q)
        return res.scalar_one_or_none()

    async def list_for_pour(self, pour_id: int) -> list[CubeSample]:
        return await self.list_by(
            CubeSample.pour_id == pour_id, order_by=CubeSample.cast_date.desc()
        )

    async def list_for_project(self, project_id: int) -> list[CubeSample]:
        q = (
            select(CubeSample)
            .join(Pour, Pour.pour_id == CubeSample.pour_id)
            .where(Pour.project_id == project_id)
            .order_by(CubeSample.cast_date.desc(), CubeSample.sample_id.desc())
        )
        res = await self.session.execute(q)
        return list(res.scalars().all())


class CubeTestRepository(BaseRepository[CubeTest]):
    model = CubeTest

    async def list_for_sample(self, sample_id: int) -> list[CubeTest]:
        return await self.list_by(
            CubeTest.sample_id == sample_id, order_by=CubeTest.test_age_days.asc()
        )

    async def list_for_samples(self, sample_ids: list[int]) -> list[CubeTest]:
        if not sample_ids:
            return []
        return await self.list_by(
            CubeTest.sample_id.in_(sample_ids), order_by=CubeTest.test_age_days.asc()
        )


class NCRRepository(BaseRepository[NCR]):
    model = NCR

    async def get_in_project(self, ncr_id: int, project_id: int) -> NCR | None:
        q = (
            select(NCR)
            .join(Pour, Pour.pour_id == NCR.pour_id)
            .where(NCR.ncr_id == ncr_id, Pour.project_id == project_id)
        )
        res = await self.session.execute(q)
        return res.scalar_one_or_none()

    async def list_for_project(self, project_id: int) -> list[NCR]:
        q = (
            select(NCR)
            .join(Pour, Pour.pour_id == NCR.pour_id)
            .where(Pour.project_id == project_id)
            .order_by(NCR.raised_at.desc())
        )
        res = await self.session.execute(q)
        return list(res.scalars().all())
