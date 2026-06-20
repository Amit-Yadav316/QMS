"""
Integration tests for the core client journey:

    register client  →  login  →  create project  →  register / invite contractor

Also covers organisation scoping and role-based access on /projects.
"""

from sqlalchemy import select

from app.models.auth import InvitationStatus, OrgInvitation, UserRole
from app.models.master import Tower
from tests.helpers import (
    API,
    DEFAULT_PASSWORD,
    bearer,
    register_and_token,
    sample_project_payload,
)


class TestCreateProject:
    async def test_client_admin_creates_project(self, client):
        token, _ = await register_and_token(client)
        resp = await client.post(
            f"{API}/projects", json=sample_project_payload(), headers=bearer(token)
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["project_id"]
        assert body["project_name"] == "Godrej Splendour Phase 2"
        assert body["project_type"] == "RESIDENTIAL"
        assert body["status"] == "ACTIVE"
        assert body["org_id"]

    async def test_created_project_appears_in_list(self, client):
        token, _ = await register_and_token(client)
        await client.post(
            f"{API}/projects", json=sample_project_payload(), headers=bearer(token)
        )
        listed = await client.get(f"{API}/projects", headers=bearer(token))
        assert listed.status_code == 200
        names = [p["project_name"] for p in listed.json()]
        assert "Godrej Splendour Phase 2" in names

    async def test_towers_are_persisted(self, client, db_session):
        token, _ = await register_and_token(client)
        resp = await client.post(
            f"{API}/projects", json=sample_project_payload(), headers=bearer(token)
        )
        project_id = resp.json()["project_id"]

        towers = (
            await db_session.execute(
                select(Tower).where(Tower.project_id == project_id)
            )
        ).scalars().all()
        assert {t.tower_name for t in towers} == {"Tower A", "Tower B"}

    async def test_create_project_requires_auth(self, client):
        resp = await client.post(f"{API}/projects", json=sample_project_payload())
        assert resp.status_code in (401, 403)


class TestRegisterContractor:
    async def test_register_contractor_creates_org_and_invitation(self, client, db_session):
        token, _ = await register_and_token(client)
        resp = await client.post(
            f"{API}/auth/register-contractor",
            json={
                "org_name": "L&T Construction",
                "contact_email": "contractor.admin@example.com",
                "contact_phone": "+918800000000",
            },
            headers=bearer(token),
        )
        assert resp.status_code == 201, resp.text
        org = resp.json()
        assert org["org_type"] == "CONTRACTOR"
        assert org["status"] == "ACTIVE"

        # A pending CONTRACTOR_ADMIN invitation should have been created.
        inv = (
            await db_session.execute(
                select(OrgInvitation).where(
                    OrgInvitation.invited_email == "contractor.admin@example.com"
                )
            )
        ).scalar_one()
        assert inv.role == UserRole.CONTRACTOR_ADMIN
        assert inv.status == InvitationStatus.PENDING

    async def test_register_contractor_requires_auth(self, client):
        resp = await client.post(
            f"{API}/auth/register-contractor",
            json={"org_name": "X", "contact_email": "x@example.com"},
        )
        assert resp.status_code in (401, 403)


class TestInviteEndpoint:
    async def test_client_can_invite_contractor_admin(self, client):
        token, _ = await register_and_token(client)
        resp = await client.post(
            f"{API}/auth/invite",
            json={"invited_email": "newcontractor@example.com", "role": "CONTRACTOR_ADMIN"},
            headers=bearer(token),
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["role"] == "CONTRACTOR_ADMIN"
        assert body["status"] == "PENDING"

    async def test_client_cannot_invite_project_manager(self, client):
        token, _ = await register_and_token(client)
        resp = await client.post(
            f"{API}/auth/invite",
            json={"invited_email": "pm@example.com", "role": "PROJECT_MANAGER"},
            headers=bearer(token),
        )
        assert resp.status_code == 403


class TestFullClientToContractorJourney:
    async def test_end_to_end(self, client, db_session):
        # 1. Client signs up.
        client_token, reg = await register_and_token(client)
        assert reg["user"]["role"] == "CLIENT_ADMIN"

        # 2. Client logs in (independent of the register tokens).
        login = await client.post(
            f"{API}/auth/login",
            json={"email": "client.admin@example.com", "password": DEFAULT_PASSWORD},
        )
        assert login.status_code == 200

        # 3. Client creates a project.
        proj = await client.post(
            f"{API}/projects", json=sample_project_payload(), headers=bearer(client_token)
        )
        assert proj.status_code == 201

        # 4. Client registers (invites) a contractor org.
        contractor_email = "contractor.admin@example.com"
        reg_contractor = await client.post(
            f"{API}/auth/register-contractor",
            json={"org_name": "L&T Construction", "contact_email": contractor_email},
            headers=bearer(client_token),
        )
        assert reg_contractor.status_code == 201

        # 5. Retrieve the emailed invitation token (email itself is stubbed).
        inv = (
            await db_session.execute(
                select(OrgInvitation).where(OrgInvitation.invited_email == contractor_email)
            )
        ).scalar_one()

        # 6. Contractor accepts the invitation → becomes CONTRACTOR_ADMIN.
        accept = await client.post(
            f"{API}/auth/accept-invitation",
            json={
                "token": inv.token,
                "full_name": "Ravi Contractor",
                "password": DEFAULT_PASSWORD,
                "confirm_password": DEFAULT_PASSWORD,
            },
        )
        assert accept.status_code == 201, accept.text
        contractor_body = accept.json()
        contractor_token = contractor_body["access_token"]
        assert contractor_body["user"]["role"] == "CONTRACTOR_ADMIN"
        assert contractor_body["user"]["is_org_admin"] is True

        # 7. Invitation is now marked accepted.
        await db_session.refresh(inv)
        assert inv.status == InvitationStatus.ACCEPTED

        # 8. Contractor can log in.
        contractor_login = await client.post(
            f"{API}/auth/login",
            json={"email": contractor_email, "password": DEFAULT_PASSWORD},
        )
        assert contractor_login.status_code == 200

        # 9. Org scoping: contractor sees none of the client's projects.
        contractor_projects = await client.get(
            f"{API}/projects", headers=bearer(contractor_token)
        )
        assert contractor_projects.status_code == 200
        assert contractor_projects.json() == []

        # 10. RBAC: contractor cannot create a project (CLIENT_ADMIN only)...
        forbidden_project = await client.post(
            f"{API}/projects", json=sample_project_payload(), headers=bearer(contractor_token)
        )
        assert forbidden_project.status_code == 403

        # ...nor register further contractors.
        forbidden_contractor = await client.post(
            f"{API}/auth/register-contractor",
            json={"org_name": "Sub Co", "contact_email": "sub@example.com"},
            headers=bearer(contractor_token),
        )
        assert forbidden_contractor.status_code == 403


class TestProjectOrgScoping:
    async def test_each_org_sees_only_its_projects(self, client):
        token_a, _ = await register_and_token(
            client, org_name="Org A", email="a.admin@example.com"
        )
        token_b, _ = await register_and_token(
            client, org_name="Org B", email="b.admin@example.com"
        )

        await client.post(
            f"{API}/projects",
            json=sample_project_payload(project_name="Project A", towers=[]),
            headers=bearer(token_a),
        )
        await client.post(
            f"{API}/projects",
            json=sample_project_payload(project_name="Project B", towers=[]),
            headers=bearer(token_b),
        )

        list_a = (await client.get(f"{API}/projects", headers=bearer(token_a))).json()
        list_b = (await client.get(f"{API}/projects", headers=bearer(token_b))).json()
        assert [p["project_name"] for p in list_a] == ["Project A"]
        assert [p["project_name"] for p in list_b] == ["Project B"]
