"""project_repo.py — DB queries for projects and their towers."""

from app.models.master import Project, Tower
from app.repositories.base_repo import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    model = Project

    async def add_tower(self, tower: Tower) -> Tower:
        self.session.add(tower)
        await self.session.flush()
        await self.session.refresh(tower)
        return tower
