"""Unit tests for the IS 456 cube-strength quality engine (pure functions)."""

import pytest

from app.core import quality_engine
from app.models.quality import ResultStatus


class TestRequiredStrength:
    def test_28_day_is_full_characteristic_strength(self):
        assert quality_engine.required_strength(40, 28) == 40.0

    def test_7_day_is_65_percent(self):
        assert quality_engine.required_strength(40, 7) == 26.0

    def test_explicit_threshold_overrides_age_fraction(self):
        # A pinned GradeThreshold wins over the default fraction.
        assert quality_engine.required_strength(40, 7, threshold_mpa=30) == 30.0

    def test_unknown_age_beyond_28_is_full_strength(self):
        assert quality_engine.required_strength(30, 56) == 30.0


class TestClassify:
    @pytest.mark.parametrize(
        "observed,required,expected",
        [
            (40.0, 40.0, ResultStatus.PASS),       # exactly meets
            (41.5, 40.0, ResultStatus.PASS),       # exceeds
            (39.9, 40.0, ResultStatus.FAIL),       # marginal miss
            (34.0, 40.0, ResultStatus.FAIL),       # exactly 85%
            (33.9, 40.0, ResultStatus.CRITICAL_FAILURE),  # below 85%
            (10.0, 40.0, ResultStatus.CRITICAL_FAILURE),
        ],
    )
    def test_bands(self, observed, required, expected):
        assert quality_engine.classify(observed, required) == expected

    def test_zero_required_does_not_divide_by_zero(self):
        assert quality_engine.classify(10.0, 0) == ResultStatus.PASS
        assert quality_engine.classify(0.0, 0) == ResultStatus.PENDING
