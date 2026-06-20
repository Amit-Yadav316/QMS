"""supplier_repo.py — DB queries for RMC suppliers."""

from app.models.master import Supplier
from app.repositories.base_repo import BaseRepository


class SupplierRepository(BaseRepository[Supplier]):
    model = Supplier
