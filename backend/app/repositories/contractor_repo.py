"""contractor_repo.py — DB queries for project↔contractor assignments."""

from sqlalchemy import select

from app.models.auth import Organisation, OrgType
from app.models.master import ProjectContractor
from app.repositories.base_repo import BaseRepository


class ContractorRepository(BaseRepository[ProjectContractor]):
    model = ProjectContractor

    async def list_for_project(self, project_id: int) -> list[ProjectContractor]:
        result = await self.session.execute(
            select(ProjectContractor)
            .where(ProjectContractor.project_id == project_id)
            .order_by(ProjectContractor.assigned_at.desc())
        )
        return list(result.scalars().all())

    async def list_for_contractor_org(self, org_id: int) -> list[ProjectContractor]:
        result = await self.session.execute(
            select(ProjectContractor)
            .where(ProjectContractor.contractor_org_id == org_id)
            .order_by(ProjectContractor.assigned_at.desc())
        )
        return list(result.scalars().all())

    async def get_existing_link(
        self, project_id: int, contractor_org_id: int
    ) -> ProjectContractor | None:
        result = await self.session.execute(
            select(ProjectContractor).where(
                ProjectContractor.project_id == project_id,
                ProjectContractor.contractor_org_id == contractor_org_id,
            )
        )
        return result.scalar_one_or_none()

    async def contractor_orgs_registered_by(self, client_org_id: int) -> list[Organisation]:
        """Contractor orgs this client previously brought onto the portal."""
        result = await self.session.execute(
            select(Organisation).where(
                Organisation.org_type == OrgType.CONTRACTOR,
                Organisation.registered_by_org_id == client_org_id,
            )
        )
        return list(result.scalars().all())
