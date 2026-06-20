"""projects.py router — /projects endpoints.

Create is CLIENT_ADMIN only (clients own projects); listing is available to
any authenticated user, scoped to their organisation.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_role
from app.database.session import get_db
from app.models.auth import User, UserRole
from app.schemas.master import ProjectCreate, ProjectResponse
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(require_role(UserRole.CLIENT_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """CLIENT_ADMIN creates a project (and optional towers) for their org."""
    return await ProjectService(db).create(data, current_user)


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List projects belonging to the current user's organisation."""
    return await ProjectService(db).list_for_org(current_user)
