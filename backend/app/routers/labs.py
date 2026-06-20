"""labs.py router — /labs endpoints.

Create is CONTRACTOR_ADMIN / PROJECT_MANAGER (contractors register labs);
listing is available to any authenticated user, scoped to their org.

Note: the public/external lab self-registration via invitation token is a
later-phase concern. For now labs are created by authenticated contractor users.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_role
from app.database.session import get_db
from app.models.auth import User, UserRole
from app.schemas.master import LabCreate, LabResponse
from app.services.lab_service import LabService

router = APIRouter(prefix="/labs", tags=["labs"])


@router.post("", response_model=LabResponse, status_code=201)
async def create_lab(
    data: LabCreate,
    current_user: User = Depends(
        require_role(UserRole.CONTRACTOR_ADMIN, UserRole.PROJECT_MANAGER)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Register a testing lab under the current user's contractor org."""
    return await LabService(db).create(data, current_user)


@router.get("", response_model=list[LabResponse])
async def list_labs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List testing labs belonging to the current user's organisation."""
    return await LabService(db).list_for_org(current_user)
