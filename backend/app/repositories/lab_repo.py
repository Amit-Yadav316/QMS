"""lab_repo.py — DB queries for testing labs."""

from app.models.master import TestingLab
from app.repositories.base_repo import BaseRepository


class LabRepository(BaseRepository[TestingLab]):
    model = TestingLab
