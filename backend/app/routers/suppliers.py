"""suppliers.py router — /suppliers endpoints.

Create is CONTRACTOR_ADMIN / PROJECT_MANAGER (contractors own suppliers);
listing is available to any authenticated user, scoped to their org.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_role
from app.database.session import get_db
from app.models.auth import User, UserRole
from app.schemas.master import SupplierCreate, SupplierResponse
from app.services.supplier_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.post("", response_model=SupplierResponse, status_code=201)
async def create_supplier(
    data: SupplierCreate,
    current_user: User = Depends(
        require_role(UserRole.CONTRACTOR_ADMIN, UserRole.PROJECT_MANAGER)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Register an RMC supplier under the current user's contractor org."""
    return await SupplierService(db).create(data, current_user)


@router.get("", response_model=list[SupplierResponse])
async def list_suppliers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List suppliers belonging to the current user's organisation."""
    return await SupplierService(db).list_for_org(current_user)
