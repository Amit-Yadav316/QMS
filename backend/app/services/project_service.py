"""project_service.py — business logic for projects.

A project is owned by the CLIENT organisation that creates it (org_id =
current user's org). Optional towers are created alongside it.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.master import Project, Tower
from app.repositories.project_repo import ProjectRepository
from app.schemas.master import ProjectCreate, ProjectResponse


class ProjectService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ProjectRepository(session)

    async def create(self, data: ProjectCreate, user: User) -> ProjectResponse:
        project = Project(
            org_id=user.org_id,
            **data.model_dump(exclude={"towers"}),
        )
        project = await self.repo.add(project)

        for tower_data in data.towers:
            await self.repo.add_tower(
                Tower(project_id=project.project_id, **tower_data.model_dump())
            )

        return ProjectResponse.model_validate(project)

    async def list_for_org(self, user: User) -> list[ProjectResponse]:
        projects = await self.repo.list_by(
            Project.org_id == user.org_id,
            order_by=Project.created_at.desc(),
        )
        return [ProjectResponse.model_validate(p) for p in projects]
