"""
Integration tests for Phase 5B — the four IS-456/10262 statistical charts:
run chart, normal distribution, target-mean bar, strength-vs-age. Each reuses
the analytics filter machinery and the quality engine's target-mean math.
"""

from tests.helpers import API, approve_mix_design, bearer
from tests.integration.test_phase4_cube_flow import _cast_sample, _qe_pour, _record_test


async def _pour_with_result(client, db_session, observed=34.0):
    _, qe_token, pid, pour_id = await _qe_pour(client, db_session)  # M30, 2026-07-15
    sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
    await _record_test(
        client, db_session, qe_token, pid, sample_id, observed_strength_mpa=observed
    )
    pour = (
        await client.get(f"{API}/projects/{pid}/pours/{pour_id}", headers=bearer(qe_token))
    ).json()
    return qe_token, pid, pour


class TestStatisticalCharts:
    async def test_run_chart_control_lines(self, client, db_session):
        qe_token, pid, pour = await _pour_with_result(client, db_session, observed=34.0)
        resp = await client.get(
            f"{API}/projects/{pid}/analytics/run-chart",
            params={"grade_id": pour["grade_id"]},
            headers=bearer(qe_token),
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert [p["observed_mpa"] for p in body["points"]] == [34.0]
        assert body["fck"] == 30.0  # M30
        assert body["individual_min"] == 27.0  # fck − 3
        assert body["target_mean"] == 38.25  # fck + 1.65·σ (IS-10262 assumed σ=5)

    async def test_distribution_reports_fck_and_count(self, client, db_session):
        qe_token, pid, pour = await _pour_with_result(client, db_session, observed=34.0)
        resp = await client.get(
            f"{API}/projects/{pid}/analytics/distribution",
            params={"grade_id": pour["grade_id"]},
            headers=bearer(qe_token),
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["sample_count"] == 1
        assert resp.json()["fck"] == 30.0

    async def test_target_mean_bar(self, client, db_session):
        qe_token, pid, _pour = await _pour_with_result(client, db_session, observed=34.0)
        resp = await client.get(
            f"{API}/projects/{pid}/analytics/target-mean", headers=bearer(qe_token)
        )
        assert resp.status_code == 200, resp.text
        m30 = next(r for r in resp.json()["rows"] if r["grade_name"] == "M30")
        assert m30["fck"] == 30.0
        assert m30["target_mean"] == 38.25
        assert m30["actual_mean"] == 34.0

    async def test_strength_vs_age(self, client, db_session):
        qe_token, pid, pour = await _pour_with_result(client, db_session, observed=34.0)
        resp = await client.get(
            f"{API}/projects/{pid}/analytics/strength-vs-age",
            params={"tower_id": pour["tower_id"]},
            headers=bearer(qe_token),
        )
        assert resp.status_code == 200, resp.text
        points = resp.json()["points"]
        assert any(p["test_age_days"] == 28 for p in points)
        assert points[0]["observed_mpa"] == 34.0

    async def test_target_mean_uses_rmc_design_value(self, client, db_session):
        contractor_token, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample_id = (await _cast_sample(client, qe_token, pid, pour_id)).json()["sample_id"]
        await _record_test(client, db_session, qe_token, pid, sample_id, observed_strength_mpa=34.0)
        pour = (
            await client.get(f"{API}/projects/{pid}/pours/{pour_id}", headers=bearer(qe_token))
        ).json()
        # The RMC states a design target mean of 40 MPa → the chart uses it, not fck+1.65σ.
        await approve_mix_design(
            client,
            contractor_token=contractor_token,
            qe_token=qe_token,
            project_id=pid,
            supplier_id=pour["supplier_horizontal_id"],
            grade_id=pour["grade_id"],
            target_mean_strength_mpa=40.0,
        )
        resp = await client.get(
            f"{API}/projects/{pid}/analytics/target-mean", headers=bearer(qe_token)
        )
        m30 = next(r for r in resp.json()["rows"] if r["grade_name"] == "M30")
        assert m30["target_mean"] == 40.0

    async def test_strength_vs_age_pins_one_batch(self, client, db_session):
        _, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        sample = (
            await _cast_sample(client, qe_token, pid, pour_id, sample_reference="CUBE011")
        ).json()
        await _record_test(
            client, db_session, qe_token, pid, sample["sample_id"], observed_strength_mpa=34.0
        )
        resp = await client.get(
            f"{API}/projects/{pid}/analytics/strength-vs-age",
            params={"sample_id": sample["sample_id"]},
            headers=bearer(qe_token),
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["reference"] == "CUBE011"
        assert resp.json()["points"][0]["observed_mpa"] == 34.0
