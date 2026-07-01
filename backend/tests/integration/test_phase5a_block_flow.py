"""
Integration tests for Phase 5A — blocking RMC suppliers + testing labs:

  A QE/PM/contractor blocks a supplier or lab (with a reason) so no NEW work
  goes to it (dispatch, mix-design request, cube dispatch). Already-issued tokens
  keep working; unblock re-enables new use.
"""

from tests.helpers import API, bearer
from tests.integration.test_phase3_dispatch_flow import (
    _dispatch_refs,
    _fill_truck,
    _project_with_qe_and_supervisor,
    _raise_dispatch,
)
from tests.integration.test_phase4_cube_flow import _cast_sample, _qe_pour


async def _block_supplier(client, token, pid, sid, reason="Quality issues"):
    return await client.post(
        f"{API}/projects/{pid}/suppliers/{sid}/block",
        json={"reason": reason},
        headers=bearer(token),
    )


class TestSupplierBlocking:
    async def test_block_prevents_dispatch_then_unblock_allows(self, client, db_session):
        contractor_token, qe_token, _, pid = await _project_with_qe_and_supervisor(
            client, db_session
        )
        refs = await _dispatch_refs(client, contractor_token, qe_token, pid)
        sid = refs["supplier_id"]

        blocked = await _block_supplier(client, qe_token, pid, sid)
        assert blocked.status_code == 200, blocked.text
        assert blocked.json()["is_blocked"] is True
        assert blocked.json()["block_reason"] == "Quality issues"

        resp = await _raise_dispatch(client, qe_token, pid, refs)
        assert resp.status_code == 400
        assert "blocked" in resp.json()["detail"].lower()

        unb = await client.post(
            f"{API}/projects/{pid}/suppliers/{sid}/unblock", headers=bearer(qe_token)
        )
        assert unb.json()["is_blocked"] is False
        assert (await _raise_dispatch(client, qe_token, pid, refs)).status_code == 201

    async def test_block_prevents_mix_request(self, client, db_session):
        contractor_token, qe_token, _, pid = await _project_with_qe_and_supervisor(
            client, db_session
        )
        refs = await _dispatch_refs(client, contractor_token, qe_token, pid)
        await _block_supplier(client, qe_token, pid, refs["supplier_id"])
        grades = (await client.get(f"{API}/grades", headers=bearer(qe_token))).json()
        resp = await client.put(
            f"{API}/projects/{pid}/suppliers/{refs['supplier_id']}/required-grades",
            json={"grade_ids": [grades[0]["grade_id"]]},
            headers=bearer(contractor_token),
        )
        assert resp.status_code == 400

    async def test_in_flight_dispatch_unaffected(self, client, db_session):
        contractor_token, qe_token, _, pid = await _project_with_qe_and_supervisor(
            client, db_session
        )
        refs = await _dispatch_refs(client, contractor_token, qe_token, pid)
        token = (await _raise_dispatch(client, qe_token, pid, refs)).json()["truck"]["token"]
        await _block_supplier(client, qe_token, pid, refs["supplier_id"])
        # The already-issued truck token still fills.
        assert (await _fill_truck(client, token)).status_code == 200

    async def test_non_blocker_role_cannot_block(self, client, db_session):
        contractor_token, qe_token, sup_token, pid = (
            await _project_with_qe_and_supervisor(client, db_session)
        )
        refs = await _dispatch_refs(client, contractor_token, qe_token, pid)
        # A site supervisor is not a blocker role.
        resp = await _block_supplier(client, sup_token, pid, refs["supplier_id"])
        assert resp.status_code == 403


class TestLabBlocking:
    async def test_block_lab_prevents_cast(self, client, db_session):
        contractor_token, qe_token, pid, pour_id = await _qe_pour(client, db_session)
        lab = (
            await client.post(
                f"{API}/projects/{pid}/labs",
                json={
                    "lab_name": "QA Lab",
                    "lab_type": "THIRD_PARTY",
                    "contact_email": "qa@lab.example",
                },
                headers=bearer(contractor_token),
            )
        ).json()
        blocked = await client.post(
            f"{API}/projects/{pid}/labs/{lab['lab_id']}/block",
            json={"reason": "NABL accreditation expired"},
            headers=bearer(qe_token),
        )
        assert blocked.json()["is_blocked"] is True

        resp = await _cast_sample(client, qe_token, pid, pour_id, lab_id=lab["lab_id"])
        assert resp.status_code == 400
        assert "blocked" in resp.json()["detail"].lower()

        await client.post(
            f"{API}/projects/{pid}/labs/{lab['lab_id']}/unblock", headers=bearer(qe_token)
        )
        assert (
            await _cast_sample(client, qe_token, pid, pour_id, lab_id=lab["lab_id"])
        ).status_code == 201
