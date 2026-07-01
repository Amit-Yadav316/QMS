"""Unit tests for the pure date-ordering helper (app/core/date_rules.py)."""

from datetime import date

import pytest

from app.core.date_rules import ensure_not_after
from app.core.exceptions import DateIntegrityError


class TestEnsureNotAfter:
    def test_skips_when_either_date_is_none(self):
        # No reference date recorded → nothing to check.
        ensure_not_after(None, date(2026, 1, 10), earlier_label="a", later_label="b")
        ensure_not_after(date(2026, 1, 10), None, earlier_label="a", later_label="b")
        ensure_not_after(None, None, earlier_label="a", later_label="b")

    def test_equal_dates_are_allowed(self):
        # Same-day events (cast == pour, testing == received) are normal.
        ensure_not_after(
            date(2026, 1, 10), date(2026, 1, 10), earlier_label="a", later_label="b"
        )

    def test_earlier_before_later_is_allowed(self):
        ensure_not_after(
            date(2026, 1, 10), date(2026, 1, 11), earlier_label="a", later_label="b"
        )

    def test_inverted_dates_raise_with_both_labels(self):
        with pytest.raises(DateIntegrityError) as exc:
            ensure_not_after(
                date(2026, 1, 11),
                date(2026, 1, 10),
                earlier_label="project start date",
                later_label="project end date",
            )
        detail = exc.value.detail
        assert "project start date" in detail
        assert "project end date" in detail
        assert exc.value.status_code == 400
