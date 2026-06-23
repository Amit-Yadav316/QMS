"""lab_service.py — business logic for testing labs.

A lab is owned by the contractor organisation that registers it
(contractor_org_id = current user's org).
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.master import Project, TestingLab
from app.repositories.lab_repo import LabRepository
from app.schemas.master import LabCreate, LabResponse


class LabService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = LabRepository(session)

    async def create(
        self, data: LabCreate, project: Project, user: User
    ) -> LabResponse:
        lab = TestingLab(
            contractor_org_id=user.org_id,
            project_id=project.project_id,
            **data.model_dump(),
        )
        lab = await self.repo.add(lab)
        return LabResponse.model_validate(lab)

    async def list_for_project(self, project: Project) -> list[LabResponse]:
        labs = await self.repo.list_by(
            TestingLab.project_id == project.project_id,
            order_by=TestingLab.created_at.desc(),
        )
        return [LabResponse.model_validate(lab) for lab in labs]
