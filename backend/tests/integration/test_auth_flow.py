"""Integration tests for the client auth flow: register, login, me, refresh, logout."""

from tests.helpers import (
    API,
    DEFAULT_PASSWORD,
    bearer,
    register_and_token,
    register_client_account,
)


class TestRegister:
    async def test_register_returns_tokens_and_client_admin(self, client):
        resp = await register_client_account(client)
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["access_token"]
        assert body["refresh_token"]
        assert body["token_type"] == "bearer"
        user = body["user"]
        assert user["email"] == "client.admin@example.com"
        assert user["role"] == "CLIENT_ADMIN"
        assert user["is_org_admin"] is True
        assert user["is_active"] is True

    async def test_register_duplicate_email_conflicts(self, client):
        first = await register_client_account(client)
        assert first.status_code == 201
        second = await register_client_account(client)
        assert second.status_code == 409

    async def test_register_password_mismatch_is_422(self, client):
        resp = await client.post(
            f"{API}/auth/register",
            json={
                "org_name": "Acme",
                "contact_email": "a@example.com",
                "full_name": "A B",
                "password": DEFAULT_PASSWORD,
                "confirm_password": "different",
            },
        )
        assert resp.status_code == 422

    async def test_register_short_password_is_422(self, client):
        resp = await client.post(
            f"{API}/auth/register",
            json={
                "org_name": "Acme",
                "contact_email": "a@example.com",
                "full_name": "A B",
                "password": "short",
                "confirm_password": "short",
            },
        )
        assert resp.status_code == 422


class TestLogin:
    async def test_login_success(self, client):
        await register_client_account(client)
        resp = await client.post(
            f"{API}/auth/login",
            json={"email": "client.admin@example.com", "password": DEFAULT_PASSWORD},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["access_token"]
        assert body["user"]["role"] == "CLIENT_ADMIN"

    async def test_login_wrong_password_is_401(self, client):
        await register_client_account(client)
        resp = await client.post(
            f"{API}/auth/login",
            json={"email": "client.admin@example.com", "password": "wrong-password"},
        )
        assert resp.status_code == 401

    async def test_login_unknown_email_is_401(self, client):
        resp = await client.post(
            f"{API}/auth/login",
            json={"email": "nobody@example.com", "password": DEFAULT_PASSWORD},
        )
        assert resp.status_code == 401


class TestMe:
    async def test_me_requires_auth(self, client):
        resp = await client.get(f"{API}/auth/me")
        assert resp.status_code in (401, 403)

    async def test_me_returns_user_and_org(self, client):
        token, _ = await register_and_token(client)
        resp = await client.get(f"{API}/auth/me", headers=bearer(token))
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["user"]["role"] == "CLIENT_ADMIN"
        assert body["organisation"]["org_type"] == "CLIENT"
        assert body["organisation"]["status"] == "ACTIVE"

    async def test_me_with_garbage_token_is_401(self, client):
        resp = await client.get(f"{API}/auth/me", headers=bearer("garbage.token"))
        assert resp.status_code == 401


class TestRefreshAndLogout:
    async def test_refresh_issues_working_access_token(self, client):
        resp = await register_client_account(client)
        refresh = resp.json()["refresh_token"]

        refreshed = await client.post(
            f"{API}/auth/refresh", json={"refresh_token": refresh}
        )
        assert refreshed.status_code == 200, refreshed.text
        new_access = refreshed.json()["access_token"]

        me = await client.get(f"{API}/auth/me", headers=bearer(new_access))
        assert me.status_code == 200

    async def test_logout_blacklists_access_token(self, client):
        token, _ = await register_and_token(client)

        # Token works before logout.
        assert (await client.get(f"{API}/auth/me", headers=bearer(token))).status_code == 200

        logout = await client.post(f"{API}/auth/logout", headers=bearer(token))
        assert logout.status_code == 204

        # Same token is rejected after logout (blacklisted).
        after = await client.get(f"{API}/auth/me", headers=bearer(token))
        assert after.status_code == 401
