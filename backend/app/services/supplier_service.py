"""supplier_service.py — business logic for RMC suppliers.

A supplier is owned by the contractor organisation that registers it
(contractor_org_id = current user's org).
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.master import Supplier
from app.repositories.supplier_repo import SupplierRepository
from app.schemas.master import SupplierCreate, SupplierResponse


class SupplierService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = SupplierRepository(session)

    async def create(self, data: SupplierCreate, user: User) -> SupplierResponse:
        supplier = Supplier(
            contractor_org_id=user.org_id,
            **data.model_dump(),
        )
        supplier = await self.repo.add(supplier)
        return SupplierResponse.model_validate(supplier)

    async def list_for_org(self, user: User) -> list[SupplierResponse]:
        suppliers = await self.repo.list_by(
            Supplier.contractor_org_id == user.org_id,
            order_by=Supplier.created_at.desc(),
        )
        return [SupplierResponse.model_validate(s) for s in suppliers]
