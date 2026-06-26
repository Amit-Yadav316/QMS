"""traceability.py router — Phase 6 lineage lookup.

Project-scoped under /projects/{id}; any project viewer may read. Search finds
cube samples by any reference; the detail walks one sample's full chain.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.project_access import require_project
from app.database.session import get_db
from app.models.master import Project
from app.schemas.traceability import TraceDetail, TraceRecord
from app.services.traceability_service import TraceabilityService

router = APIRouter(prefix="/projects", tags=["traceability"])


@router.get("/{project_id}/trace/search", response_model=list[TraceRecord])
async def search(
    q: str | None = None,
    project: Project = Depends(require_project),
    db: AsyncSession = Depends(get_db),
):
    return await TraceabilityService(db).search(project, q)


@router.get("/{project_id}/trace/{sample_id}", response_model=TraceDetail)
async def trace_detail(
    sample_id: int,
    project: Project = Depends(require_project),
    db: AsyncSession = Depends(get_db),
):
    return await TraceabilityService(db).trace_detail(project, sample_id)
