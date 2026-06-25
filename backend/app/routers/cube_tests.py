"""cube_tests.py router — Phase 4 cube samples, tests, and auto-NCRs.

Project-scoped under /projects/{id}. The Quality Engineer casts cube samples
from a pour and records strength tests against them; the quality engine grades
each test and auto-raises an NCR on failure. Listing (samples, tests, NCRs) is
open to anyone who can view the project.
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
    CubeSampleCreate,
    CubeSampleResponse,
    CubeTestCreate,
    CubeTestResponse,
    NCRResponse,
)
from app.services.cube_service import CubeService

router = APIRouter(prefix="/projects", tags=["quality"])


def _ensure_quality_engineer(user: User) -> None:
    if user.role != UserRole.QUALITY_ENGINEER:
        raise PermissionDeniedError(
            "Only a quality engineer can cast cube samples or record test results"
        )


# ── Samples ──────────────────────────────────────────────────────────────────


@router.post(
    "/{project_id}/pours/{pour_id}/samples",
    response_model=CubeSampleResponse,
    status_code=201,
)
async def cast_sample(
    pour_id: int,
    data: CubeSampleCreate,
    project: Project = Depends(require_project),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ensure_quality_engineer(current_user)
    return await CubeService(db).create_sample(project, pour_id, data, current_user)


@router.get(
    "/{project_id}/pours/{pour_id}/samples",
    response_model=list[CubeSampleResponse],
)
async def list_pour_samples(
    pour_id: int,
    project: Project = Depends(require_project),
    db: AsyncSession = Depends(get_db),
):
    return await CubeService(db).list_samples_for_pour(project, pour_id)


@router.get("/{project_id}/samples", response_model=list[CubeSampleResponse])
async def list_samples(
    project: Project = Depends(require_project),
    db: AsyncSession = Depends(get_db),
):
    return await CubeService(db).list_samples_for_project(project)


# ── Tests ────────────────────────────────────────────────────────────────────


@router.post(
    "/{project_id}/samples/{sample_id}/tests",
    response_model=CubeTestResponse,
    status_code=201,
)
async def record_test(
    sample_id: int,
    data: CubeTestCreate,
    project: Project = Depends(require_project),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ensure_quality_engineer(current_user)
    return await CubeService(db).record_test(project, sample_id, data, current_user)


# ── NCRs (read-only; lifecycle in Phase 5) ───────────────────────────────────


@router.get("/{project_id}/ncrs", response_model=list[NCRResponse])
async def list_ncrs(
    project: Project = Depends(require_project),
    db: AsyncSession = Depends(get_db),
):
    return await CubeService(db).list_ncrs_for_project(project)


@router.get("/{project_id}/ncrs/{ncr_id}", response_model=NCRResponse)
async def get_ncr(
    ncr_id: int,
    project: Project = Depends(require_project),
    db: AsyncSession = Depends(get_db),
):
    return await CubeService(db).get_ncr(project, ncr_id)
