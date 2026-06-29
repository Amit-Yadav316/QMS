"""rag.py — retrieval-augmented suggestion helpers for Phase 9 (pure, no I/O).

The AISuggestion service gathers NCR rows from the DB and hands them here as
``NCRDoc``s. This module turns an NCR into the text we embed (a failure case,
optionally with its recorded resolution), ranks neighbours by a precomputed
cosine score, builds the LLM prompt that grounds a suggestion in the retrieved
resolved cases, and parses the model's JSON answer defensively. Keeping all of
this side-effect-free makes it unit-testable without a DB, an LLM or an embedder.
"""

import json
import re
from dataclasses import dataclass, field

from app.models.quality import ConfidenceLevel

# The model is asked to answer as strict JSON; we still parse defensively.
SUGGESTION_SYSTEM_PROMPT = (
    "You are a concrete-quality engineer assisting with non-conformance reports "
    "(NCRs) on a construction project, working to IS 456. Given a failed cube "
    "test and a few similar PAST NCRs that were already resolved, propose the most "
    "probable root cause and a short list of concrete corrective actions. Ground "
    "your answer in the resolved cases provided; do not invent test numbers. "
    "Recommend non-destructive testing (NDT) / core testing when the failure is "
    "critical or the in-situ strength is in doubt.\n"
    "Respond with ONLY a JSON object of this exact shape:\n"
    '{"root_cause": string, "corrective_actions": [string, ...], '
    '"confidence": "HIGH"|"MEDIUM"|"LOW", "ndt_recommended": boolean}'
)

_CONFIDENCE = {c.value: c for c in ConfidenceLevel}


@dataclass
class NCRDoc:
    """Denormalised NCR fields used to build embedding/prompt text."""

    ncr_id: int
    ncr_number: str | None = None
    grade_name: str | None = None
    result_status: str | None = None
    observed_strength_mpa: float | None = None
    required_strength_mpa: float | None = None
    test_age_days: int | None = None
    tower_name: str | None = None
    floor_label: str | None = None
    component_type: str | None = None
    root_cause: str | None = None
    corrective_actions: list[str] = field(default_factory=list)


@dataclass
class Suggestion:
    root_cause: str | None
    corrective_actions: list[str]
    confidence: ConfidenceLevel
    ndt_recommended: bool


def _location(doc: NCRDoc) -> str:
    parts = [doc.tower_name, doc.floor_label, doc.component_type]
    return " / ".join(p for p in parts if p) or "unspecified location"


def _case_line(doc: NCRDoc) -> str:
    grade = doc.grade_name or "concrete"
    if doc.observed_strength_mpa is not None and doc.required_strength_mpa is not None:
        strength = (
            f"observed {doc.observed_strength_mpa} MPa vs required "
            f"{doc.required_strength_mpa} MPa at {doc.test_age_days or '?'} days"
        )
    else:
        strength = "strength below requirement"
    status = (doc.result_status or "FAIL").replace("_", " ").lower()
    return f"{grade} at {_location(doc)}: {status}, {strength}"


def failure_text(doc: NCRDoc) -> str:
    """Embedding/query text for the failure on its own (no resolution)."""
    return _case_line(doc)


def resolved_text(doc: NCRDoc) -> str:
    """Embedding text for a resolved past NCR — failure plus how it was fixed."""
    lines = [_case_line(doc)]
    if doc.root_cause:
        lines.append(f"Root cause: {doc.root_cause}")
    if doc.corrective_actions:
        lines.append("Corrective actions: " + "; ".join(doc.corrective_actions))
    return "\n".join(lines)


def build_suggestion_prompt(query: NCRDoc, neighbours: list[tuple[NCRDoc, float]]) -> str:
    """Assemble the grounded user prompt from the failing case + retrieved cases."""
    out = ["CURRENT FAILED CUBE TEST:", _case_line(query), ""]
    if neighbours:
        out.append("SIMILAR PAST NCRs THAT WERE RESOLVED:")
        for i, (doc, score) in enumerate(neighbours, 1):
            out.append(f"[{i}] (similarity {score:.2f}) {doc.ncr_number or doc.ncr_id}")
            out.append(resolved_text(doc))
            out.append("")
    else:
        out.append(
            "No similar past NCRs are on record for this project yet — base your "
            "answer on standard IS 456 concrete-quality practice and flag lower "
            "confidence."
        )
        out.append("")
    out.append(
        "Give the probable root cause and corrective actions for the current "
        "failure as JSON."
    )
    return "\n".join(out)


def rank_by_similarity(
    query_vec: list[float],
    candidates: list[tuple[NCRDoc, list[float]]],
    *,
    top_k: int,
    min_similarity: float,
    cosine,
) -> list[tuple[NCRDoc, float]]:
    """Score each candidate against the query and return the top-k (desc)."""
    scored = [(doc, cosine(query_vec, vec)) for doc, vec in candidates]
    scored = [(doc, s) for doc, s in scored if s >= min_similarity]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored[:top_k]


def parse_suggestion(content: str | None, *, default_ndt: bool = False) -> Suggestion:
    """Parse the model's JSON reply, tolerating fences / surrounding prose.

    Falls back to LOW confidence with the raw text as the root cause if the
    payload can't be read as JSON, so a malformed model reply never 500s."""
    raw = (content or "").strip()
    data = _extract_json(raw)
    if data is None:
        return Suggestion(
            root_cause=raw or None,
            corrective_actions=[],
            confidence=ConfidenceLevel.LOW,
            ndt_recommended=default_ndt,
        )

    actions_raw = data.get("corrective_actions") or []
    actions = [str(a).strip() for a in actions_raw if str(a).strip()]
    confidence = _CONFIDENCE.get(
        str(data.get("confidence", "")).upper(), ConfidenceLevel.MEDIUM
    )
    ndt = bool(data.get("ndt_recommended", False)) or default_ndt
    root = data.get("root_cause")
    return Suggestion(
        root_cause=str(root).strip() if root else None,
        corrective_actions=actions,
        confidence=confidence,
        ndt_recommended=ndt,
    )


def _extract_json(text: str) -> dict | None:
    if not text:
        return None
    # Strip a ```json … ``` fence if present, then grab the first {...} block.
    fenced = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    for candidate in (fenced, text):
        start, end = candidate.find("{"), candidate.rfind("}")
        if start != -1 and end > start:
            try:
                parsed = json.loads(candidate[start : end + 1])
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                continue
    return None
