"""
Integration tests for Phase 4 — cube samples, strength tests, and auto-NCRs:

  QE casts a cube sample from a pour → records a strength test → the quality
  engine grades it PASS / FAIL / CRITICAL_FAILURE → a failing test auto-raises
  an NCR that surfaces in the project's NCR list.

Plus RBAC (only the QE casts samples / records tests), required-strength
derivation by age, and project scoping.
"""

from tests.helpers import API, bearer
from tests.integration.test_phase2_pour_flow import _pour_refs, _project_with_qe


async def _qe_pour(client, db_session):
    """(contractor_token, qe_token, project_id, pour_id)."""
    contractor_token, qe_token, pid = await _project_with_qe(client, db_session)
    refs = await _pour_refs(client, db_session, contractor_token, qe_token, pid)
    pour = (
        await client.post(
            f"{API}/projects/{pid}/pours",
            json={**refs, "pour_date": "2026-07-15", "volume_cum": 30.0, "pour_reference": "PC-001"},
            headers=bearer(qe_token),
        )
    ).json()
    return contractor_token, qe_token, pid, pour["pour_id"]


async def _cast_sample(client, qe_token, pid, pour_id, **overrides):
    payload = {"cast_date": "2026-07-15", "no_of_cubes": 3, "sample_reference": "CS-001"}
    payload.update(overrides)
    return await client.post(
        f"{API}/projects/{pid}/pours/{pour_id}/samples",
        json=payload,
        headers=bearer(qe_token),
    )


async def _record_test(client, qe_token, pid, sample_id, **overrides):
    payload = {"test_age_days": 28, "test_date": "2026-08-12", "observed_strength_mpa": 32.0}
    payload.update(overrides)
    return await client.post(
        f"{API}/projects/{pid}/samples/{sample_id}/tests",
        json=payload,
        headers=bearer(qe_token),
    )


class TestCubeSamples:
    async def test_qe_casts_sample_with_pour_context(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        resp = await _cast_sample(client, qe_token, pid, pour_id)
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["sample_reference"] == "CS-001"
        assert body["grade_name"] == "M30"
        assert body["tower_name"]
        assert body["tests"] == []

    async def test_non_qe_cannot_cast_sample(self, client, db_session):
        contractor_token, _, pid, pour_id = await _qe_pour(client, db_session)
        resp = await _cast_sample(client, contractor_token, pid, pour_id)
        assert resp.status_code == 403

    async def test_sample_on_unknown_pour_is_404(self, client, db_session):
        _, qe_token, pid, _ = await _qe_pour(client, db_session)
        resp = await _cast_sample(client, qe_token, pid, 999999)
        assert resp.status_code == 404

    async def test_sample_appears_in_project_list(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        await _cast_sample(client, qe_token, pid, pour_id)
        rows = (
            await client.get(f"{API}/projects/{pid}/samples", headers=bearer(qe_token))
        ).json()
        assert len(rows) == 1
        assert rows[0]["sample_reference"] == "CS-001"


class TestCubeTests:
    async def test_passing_28_day_test_raises_no_ncr(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
        # M30, 28-day → required 30.0; observed 32.0 → PASS.
        resp = await _record_test(client, qe_token, pid, sample_id, observed_strength_mpa=32.0)
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["required_strength_mpa"] == 30.0
        assert body["result_status"] == "PASS"
        assert body["ncr_id"] is None

    async def test_failing_test_auto_raises_ncr(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
        # M30, 28-day → required 30.0; observed 27.0 (>= 85% = 25.5) → FAIL.
        resp = await _record_test(client, qe_token, pid, sample_id, observed_strength_mpa=27.0)
        body = resp.json()
        assert body["result_status"] == "FAIL"
        assert body["ncr_id"] is not None
        assert body["ncr_number"].startswith("NCR-")

        ncrs = (
            await client.get(f"{API}/projects/{pid}/ncrs", headers=bearer(qe_token))
        ).json()
        assert len(ncrs) == 1
        assert ncrs[0]["result_status"] == "FAIL"
        assert ncrs[0]["grade_name"] == "M30"
        assert ncrs[0]["status"] == "OPEN"

    async def test_critical_failure_below_85_percent(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
        # observed 20.0 < 85% of 30 (25.5) → CRITICAL_FAILURE, NCR raised.
        resp = await _record_test(client, qe_token, pid, sample_id, observed_strength_mpa=20.0)
        body = resp.json()
        assert body["result_status"] == "CRITICAL_FAILURE"
        assert body["ncr_id"] is not None

    async def test_7_day_required_is_65_percent(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
        # M30, 7-day → required 19.5; observed 22.0 → PASS.
        resp = await _record_test(
            client, qe_token, pid, sample_id,
            test_age_days=7, test_date="2026-07-22", observed_strength_mpa=22.0,
        )
        body = resp.json()
        assert body["required_strength_mpa"] == 19.5
        assert body["result_status"] == "PASS"

    async def test_non_qe_cannot_record_test(self, client, db_session):
        contractor_token, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
        resp = await _record_test(client, contractor_token, pid, sample_id)
        assert resp.status_code == 403

    async def test_recorded_test_shows_under_its_sample(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
        await _record_test(client, qe_token, pid, sample_id, observed_strength_mpa=27.0)
        samples = (
            await client.get(f"{API}/projects/{pid}/samples", headers=bearer(qe_token))
        ).json()
        tests = samples[0]["tests"]
        assert len(tests) == 1
        assert tests[0]["result_status"] == "FAIL"
        # The auto-raised NCR is reachable from the test row.
        assert tests[0]["ncr_id"] is not None
