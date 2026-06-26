"""documents.py — project document store DTOs."""

import enum
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentCategory(str, enum.Enum):
    """Optional tag for a project document. Mirrors ``audit.DocumentType`` plus a
    catch-all so any supporting file can still be filed."""

    MIX_DESIGN = "MIX_DESIGN"
    RMC_DETAIL = "RMC_DETAIL"
    POUR_RECORD = "POUR_RECORD"
    GRADE_DETAIL = "GRADE_DETAIL"
    CUBE_TEST_REGISTER = "CUBE_TEST_REGISTER"
    OTHER = "OTHER"


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: int
    project_id: int
    document_type: str | None
    title: str | None
    original_filename: str
    content_type: str | None
    size_bytes: int
    uploaded_by: int | None
    uploaded_by_name: str | None
    uploaded_at: datetime
