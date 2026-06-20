"""lab_service.py — business logic for testing labs.

A lab is owned by the contractor organisation that registers it
(contractor_org_id = current user's org).
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.master import TestingLab
from app.repositories.lab_repo import LabRepository
from app.schemas.master import LabCreate, LabResponse


class LabService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = LabRepository(session)

    async def create(self, data: LabCreate, user: User) -> LabResponse:
        lab = TestingLab(
            contractor_org_id=user.org_id,
            **data.model_dump(),
        )
        lab = await self.repo.add(lab)
        return LabResponse.model_validate(lab)

    async def list_for_org(self, user: User) -> list[LabResponse]:
        labs = await self.repo.list_by(
            TestingLab.contractor_org_id == user.org_id,
            order_by=TestingLab.created_at.desc(),
        )
        return [LabResponse.model_validate(lab) for lab in labs]
