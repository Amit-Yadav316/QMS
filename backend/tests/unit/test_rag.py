"""Unit tests for the Phase-9 RAG helpers (pure, no DB / LLM / embedder).

Covers the text builders, the defensive JSON parser, the cosine similarity, and
the neighbour ranking that grounds an AISuggestion.
"""

from app.ai.embeddings import cosine_similarity
from app.ai.rag import (
    NCRDoc,
    build_suggestion_prompt,
    failure_text,
    parse_suggestion,
    rank_by_similarity,
    resolved_text,
)
from app.models.quality import ConfidenceLevel


def _doc(**kw) -> NCRDoc:
    base = dict(
        ncr_id=1,
        ncr_number="NCR-20260601-0001",
        grade_name="M30",
        result_status="FAIL",
        observed_strength_mpa=27.0,
        required_strength_mpa=30.0,
        test_age_days=28,
        tower_name="Tower A",
        floor_label="L5",
        component_type="SLAB",
    )
    base.update(kw)
    return NCRDoc(**base)


class TestTextBuilders:
    def test_failure_text_has_grade_location_and_strengths(self):
        text = failure_text(_doc())
        assert "M30" in text
        assert "Tower A" in text and "L5" in text and "SLAB" in text
        assert "27.0" in text and "30.0" in text and "28" in text

    def test_resolved_text_appends_resolution(self):
        text = resolved_text(
            _doc(root_cause="Batching error", corrective_actions=["Re-pour", "NDT"])
        )
        assert "Root cause: Batching error" in text
        assert "Corrective actions: Re-pour; NDT" in text

    def test_resolved_text_omits_missing_resolution(self):
        text = resolved_text(_doc(root_cause=None, corrective_actions=[]))
        assert "Root cause" not in text
        assert "Corrective actions" not in text

    def test_prompt_lists_neighbours_and_cold_start_message(self):
        with_neighbours = build_suggestion_prompt(_doc(), [(_doc(ncr_id=2), 0.91)])
        assert "SIMILAR PAST NCRs" in with_neighbours
        assert "0.91" in with_neighbours

        cold = build_suggestion_prompt(_doc(), [])
        assert "No similar past NCRs" in cold


class TestParseSuggestion:
    def test_clean_json(self):
        s = parse_suggestion(
            '{"root_cause": "Low cement", "corrective_actions": ["Re-pour", "Core test"],'
            ' "confidence": "HIGH", "ndt_recommended": true}'
        )
        assert s.root_cause == "Low cement"
        assert s.corrective_actions == ["Re-pour", "Core test"]
        assert s.confidence is ConfidenceLevel.HIGH
        assert s.ndt_recommended is True

    def test_fenced_json_with_prose(self):
        s = parse_suggestion(
            'Here is my answer:\n```json\n{"root_cause": "X", "corrective_actions": [],'
            ' "confidence": "medium"}\n```\nThanks!'
        )
        assert s.root_cause == "X"
        assert s.confidence is ConfidenceLevel.MEDIUM

    def test_garbage_falls_back_to_low_confidence(self):
        s = parse_suggestion("the kiln was too hot, sorry no json")
        assert s.confidence is ConfidenceLevel.LOW
        assert s.root_cause == "the kiln was too hot, sorry no json"
        assert s.corrective_actions == []

    def test_default_ndt_forces_recommendation(self):
        s = parse_suggestion(
            '{"root_cause": "x", "corrective_actions": [], "ndt_recommended": false}',
            default_ndt=True,
        )
        assert s.ndt_recommended is True

    def test_blank_actions_are_dropped(self):
        s = parse_suggestion(
            '{"root_cause": "x", "corrective_actions": ["  ", "Real action", ""]}'
        )
        assert s.corrective_actions == ["Real action"]


class TestRanking:
    def test_cosine_bounds(self):
        assert cosine_similarity([1, 0], [1, 0]) == 1.0
        assert cosine_similarity([1, 0], [0, 1]) == 0.0
        assert cosine_similarity([], [1]) == 0.0
        assert cosine_similarity([1, 2], [1]) == 0.0  # length mismatch

    def test_rank_orders_and_truncates(self):
        q = [1.0, 0.0]
        candidates = [
            (_doc(ncr_id=10), [0.0, 1.0]),   # orthogonal → 0.0
            (_doc(ncr_id=11), [1.0, 0.0]),   # identical → 1.0
            (_doc(ncr_id=12), [1.0, 1.0]),   # 45° → ~0.707
        ]
        ranked = rank_by_similarity(
            q, candidates, top_k=2, min_similarity=0.0, cosine=cosine_similarity
        )
        assert [d.ncr_id for d, _ in ranked] == [11, 12]

    def test_rank_applies_min_similarity(self):
        q = [1.0, 0.0]
        candidates = [
            (_doc(ncr_id=10), [0.0, 1.0]),   # 0.0 → pruned
            (_doc(ncr_id=11), [1.0, 0.0]),   # 1.0 → kept
        ]
        ranked = rank_by_similarity(
            q, candidates, top_k=5, min_similarity=0.5, cosine=cosine_similarity
        )
        assert [d.ncr_id for d, _ in ranked] == [11]
