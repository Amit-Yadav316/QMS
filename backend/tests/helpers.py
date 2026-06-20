"""Shared helpers for the test suite — request builders and sample payloads."""

from httpx import AsyncClient, Response

API = "/api/v1"
DEFAULT_PASSWORD = "Password123!"


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def register_client_account(
    client: AsyncClient,
    *,
    org_name: str = "Godrej Properties Ltd",
    email: str = "client.admin@example.com",
    full_name: str = "Asha Client",
    phone: str | None = "+919900000000",
    password: str = DEFAULT_PASSWORD,
) -> Response:
    """POST /auth/register — client self-registers org + first CLIENT_ADMIN."""
    return await client.post(
        f"{API}/auth/register",
        json={
            "org_name": org_name,
            "contact_email": email,
            "contact_phone": phone,
            "full_name": full_name,
            "password": password,
            "confirm_password": password,
        },
    )


async def register_and_token(client: AsyncClient, **kwargs) -> tuple[str, dict]:
    """Register a client and return (access_token, json_body)."""
    resp = await register_client_account(client, **kwargs)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    return body["access_token"], body


def sample_project_payload(**overrides) -> dict:
    """A realistic ProjectCreate body matching the Project Master form."""
    payload = {
        "project_name": "Godrej Splendour Phase 2",
        "project_type": "RESIDENTIAL",
        "project_code": "P51700049510",
        "gst_number": "29AABCG1234A1Z5",
        "address_line1": "Survey 17, Whitefield",
        "city": "Bengaluru",
        "state": "KA",
        "pin_code": "560066",
        "start_date": "2026-07-01",
        "end_date": "2028-12-31",
        "no_of_towers": 2,
        "max_floors": 30,
        "acceptance_criteria": "IS 456:2000",
        "final_test_age_days": 28,
        "towers": [
            {"tower_name": "Tower A", "tower_type": "Residential", "floors_total": 30},
            {"tower_name": "Tower B", "tower_type": "Residential", "floors_total": 28},
        ],
    }
    payload.update(overrides)
    return payload
