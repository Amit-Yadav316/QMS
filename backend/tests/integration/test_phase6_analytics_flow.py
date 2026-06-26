"""Integration tests for Phase 6 — the analytics metrics layer:

  An empty project reports zero KPIs; a pour + a passing test rolls up into the
  overview bundle; a failing test raises an NCR that the overview counts as open;
  the quality endpoint returns the grade trend + strength distribution; the
  supplier scorecard aggregates pours and pass rate per supplier.

All numbers come from AnalyticsService — these tests pin the metric maths and
the project scoping (any project viewer reads; no token → 401).
"""

from tests.helpers import API, bearer
from tests.integration.test_phase2_pour_flow import _project_with_qe
from tests.integration.test_phase4_cube_flow import (
    _cast_sample,
    _qe_pour,
    _record_test,
)


async def _overview(client, token, pid):
    return await client.get(
        f"{API}/projects/{pid}/analytics/overview", headers=bearer(token)
    )


class TestOverviewKpis:
    async def test_empty_project_reports_zero(self, client, db_session):
        _, qe_token, pid = await _project_with_qe(client, db_session)
        body = (await _overview(client, qe_token, pid)).json()
        assert body["pour_count"] == 0
        assert body["pour_volume_cum"] == 0.0
        assert body["test_count"] == 0
        assert body["pass_rate_pct"] is None
        assert body["ncr_open"] == 0

    async def test_pour_and_passing_test_roll_up(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
        # M30, 28-day → required 30.0; observed 32.0 → PASS.
        await _record_test(client, qe_token, pid, sample_id, observed_strength_mpa=32.0)

        body = (await _overview(client, qe_token, pid)).json()
        assert body["pour_count"] == 1
        assert body["pour_volume_cum"] == 30.0
        assert body["test_count"] == 1
        assert body["pass_count"] == 1
        assert body["pass_rate_pct"] == 100.0
        assert body["avg_strength_mpa"] == 32.0
        assert body["ncr_open"] == 0

    async def test_failing_test_counts_as_open_ncr(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
        # observed 20.0 < 85% of 30 (25.5) → CRITICAL_FAILURE → auto-NCR.
        await _record_test(client, qe_token, pid, sample_id, observed_strength_mpa=20.0)

        body = (await _overview(client, qe_token, pid)).json()
        assert body["critical_count"] == 1
        assert body["fail_count"] == 0
        assert body["pass_rate_pct"] == 0.0
        assert body["ncr_open"] == 1


class TestQualityAnalytics:
    async def test_grade_trend_and_distribution(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
        await _record_test(
            client, qe_token, pid, sample_id,
            test_date="2026-08-12", observed_strength_mpa=32.0,
        )

        body = (
            await client.get(
                f"{API}/projects/{pid}/analytics/quality", headers=bearer(qe_token)
            )
        ).json()
        trend = body["grade_trend"]
        assert len(trend) == 1
        assert trend[0]["period"] == "2026-08"
        assert trend[0]["grade_name"] == "M30"
        assert trend[0]["pass_rate_pct"] == 100.0

        dist = {b["label"]: b["count"] for b in body["strength_distribution"]}
        assert dist == {"<35": 1}

    async def test_quality_date_filter_excludes_out_of_range(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
        await _record_test(client, qe_token, pid, sample_id, test_date="2026-08-12")

        body = (
            await client.get(
                f"{API}/projects/{pid}/analytics/quality?date_from=2026-09-01",
                headers=bearer(qe_token),
            )
        ).json()
        assert body["grade_trend"] == []
        assert body["strength_distribution"] == []


class TestSupplierScorecard:
    async def test_scorecard_aggregates_supplier(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
        await _record_test(client, qe_token, pid, sample_id, observed_strength_mpa=32.0)

        rows = (
            await client.get(
                f"{API}/projects/{pid}/analytics/suppliers", headers=bearer(qe_token)
            )
        ).json()
        assert len(rows) == 1
        score = rows[0]
        assert score["supplier_name"] == "UltraTech RMC"
        assert score["pour_count"] == 1
        assert score["pour_volume_cum"] == 30.0
        assert score["test_count"] == 1
        assert score["pass_rate_pct"] == 100.0


class TestAnalyticsAccess:
    async def test_overview_requires_auth(self, client, db_session):
        _, qe_token, pid = await _project_with_qe(client, db_session)
        resp = await client.get(f"{API}/projects/{pid}/analytics/overview")
        assert resp.status_code == 403  # HTTPBearer rejects a missing token
