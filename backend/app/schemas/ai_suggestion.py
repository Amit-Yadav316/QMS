"""schemas/ai_suggestion.py — Phase-9 AISuggestion request/response models.

An AISuggestion is the RAG output for a failing NCR: a probable root cause and
corrective actions, grounded in similar past CLOSED NCRs (the ``retrieved``
cases, kept for transparency / audit). A Quality Engineer reviews it and may
*apply* it — copying the root cause onto the NCR and turning the suggested
actions into real corrective-action rows (human-in-the-loop).
"""

from datetime import datetime

from pydantic import BaseModel

from app.models.quality import ConfidenceLevel


class RetrievedNCR(BaseModel):
    """One past resolved NCR that grounded the suggestion."""

    ncr_id: int
    ncr_number: str | None = None
    similarity: float
    grade_name: str | None = None
    result_status: str | None = None
    root_cause: str | None = None
    corrective_actions: list[str] = []


class AISuggestionResponse(BaseModel):
    suggestion_id: int
    ncr_id: int
    test_id: int
    root_cause_text: str | None = None
    corrective_actions: list[str] = []
    confidence_level: ConfidenceLevel | None = None
    ndt_recommended: bool = False
    retrieved: list[RetrievedNCR] = []
    generated_at: datetime


class AISuggestionApply(BaseModel):
    """What to carry over when accepting a suggestion (all default on)."""

    apply_root_cause: bool = True
    apply_corrective_actions: bool = True
