"""ncrs.py router — Phase 5 NCR lifecycle.

Project-scoped under /projects/{id}. Anyone who can view the project reads the
NCR list and detail; the Quality Engineer drives the lifecycle — recording the
root cause, advancing the status (OPEN → UNDER_REVIEW → CLOSED), logging
corrective actions, and applying penalties.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.exceptions import PermissionDeniedError
from app.core.project_access import require_project
from app.database.session import get_db
from app.models.auth import User, UserRole
from app.models.master import Project
from app.schemas.quality import (
    CorrectiveActionCreate,
    CorrectiveActionResponse,
    CorrectiveActionUpdate,
    NCRDetailResponse,
    NCRResponse,
    NCRUpdate,
    PenaltyCreate,
    PenaltyResponse,
)
from app.services.ncr_service import NCRService

router = APIRouter(prefix="/projects", tags=["quality"])


def _ensure_quality_engineer(user: User) -> None:
    if user.role != UserRole.QUALITY_ENGINEER:
        raise PermissionDeniedError(
            "Only a quality engineer can manage the NCR lifecycle"
        )


# ── Reads (any project viewer) ────────────────────────────────────────────────


@router.get("/{project_id}/ncrs", response_model=list[NCRResponse])
async def list_ncrs(
    project: Project = Depends(require_project),
    db: AsyncSession = Depends(get_db),
):
    return await NCRService(db).list_ncrs(project)


@router.get("/{project_id}/ncrs/{ncr_id}", response_model=NCRDetailResponse)
async def get_ncr(
    ncr_id: int,
    project: Project = Depends(require_project),
    db: AsyncSession = Depends(get_db),
):
    return await NCRService(db).get_ncr(project, ncr_id)


# ── Lifecycle (Quality Engineer) ──────────────────────────────────────────────


@router.patch("/{project_id}/ncrs/{ncr_id}", response_model=NCRDetailResponse)
async def update_ncr(
    ncr_id: int,
    data: NCRUpdate,
    project: Project = Depends(require_project),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ensure_quality_engineer(current_user)
    return await NCRService(db).update_ncr(project, ncr_id, data, current_user)


@router.post(
    "/{project_id}/ncrs/{ncr_id}/corrective-actions",
    response_model=CorrectiveActionResponse,
    status_code=201,
)
async def add_corrective_action(
    ncr_id: int,
    data: CorrectiveActionCreate,
    project: Project = Depends(require_project),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ensure_quality_engineer(current_user)
    return await NCRService(db).add_corrective_action(
        project, ncr_id, data, current_user
    )


@router.patch(
    "/{project_id}/ncrs/{ncr_id}/corrective-actions/{action_id}",
    response_model=CorrectiveActionResponse,
)
async def update_corrective_action(
    ncr_id: int,
    action_id: int,
    data: CorrectiveActionUpdate,
    project: Project = Depends(require_project),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ensure_quality_engineer(current_user)
    return await NCRService(db).update_corrective_action(
        project, ncr_id, action_id, data, current_user
    )


@router.post(
    "/{project_id}/ncrs/{ncr_id}/penalties",
    response_model=PenaltyResponse,
    status_code=201,
)
async def add_penalty(
    ncr_id: int,
    data: PenaltyCreate,
    project: Project = Depends(require_project),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ensure_quality_engineer(current_user)
    return await NCRService(db).add_penalty(project, ncr_id, data, current_user)
