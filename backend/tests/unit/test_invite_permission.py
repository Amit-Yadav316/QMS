"""Unit tests for the "who can invite whom" matrix in app.routers.auth."""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models.auth import UserRole
from app.routers.auth import _validate_invite_permission


def _user(role: UserRole) -> SimpleNamespace:
    # _validate_invite_permission only reads `.role` (and `.role.value` on error).
    return SimpleNamespace(role=role)


# (inviter, target) pairs that should be allowed.
ALLOWED = [
    (UserRole.CLIENT_ADMIN, UserRole.CLIENT_USER),
    (UserRole.CONTRACTOR_ADMIN, UserRole.CONTRACTOR_USER),
    (UserRole.CONTRACTOR_ADMIN, UserRole.PROJECT_MANAGER),
    (UserRole.CONTRACTOR_ADMIN, UserRole.SUPERVISOR),
    (UserRole.CONTRACTOR_ADMIN, UserRole.QUALITY_ENGINEER),
    (UserRole.CONTRACTOR_USER, UserRole.PROJECT_MANAGER),
    (UserRole.CONTRACTOR_USER, UserRole.SUPERVISOR),
    (UserRole.CONTRACTOR_USER, UserRole.QUALITY_ENGINEER),
]

# (inviter, target) pairs that must be rejected.
FORBIDDEN = [
    # Client admin can only invite client users (contractors come in via
    # POST /projects/{id}/contractors, not this matrix).
    (UserRole.CLIENT_ADMIN, UserRole.CONTRACTOR_ADMIN),
    (UserRole.CLIENT_ADMIN, UserRole.PROJECT_MANAGER),
    (UserRole.CLIENT_ADMIN, UserRole.CLIENT_ADMIN),
    # Client users cannot invite anyone via this endpoint.
    (UserRole.CLIENT_USER, UserRole.CLIENT_USER),
    (UserRole.CLIENT_USER, UserRole.PROJECT_MANAGER),
    # Contractor users cannot create more contractor users (admin-only).
    (UserRole.CONTRACTOR_USER, UserRole.CONTRACTOR_USER),
    (UserRole.CONTRACTOR_ADMIN, UserRole.CONTRACTOR_ADMIN),
    # Leaf roles cannot invite anyone.
    (UserRole.PROJECT_MANAGER, UserRole.QUALITY_ENGINEER),
    (UserRole.PROJECT_MANAGER, UserRole.SUPERVISOR),
    (UserRole.QUALITY_ENGINEER, UserRole.SUPERVISOR),
    (UserRole.SUPERVISOR, UserRole.QUALITY_ENGINEER),
]


@pytest.mark.parametrize("inviter, target", ALLOWED)
def test_allowed_invites_do_not_raise(inviter, target):
    # Should simply return without raising.
    _validate_invite_permission(_user(inviter), target)


@pytest.mark.parametrize("inviter, target", FORBIDDEN)
def test_forbidden_invites_raise_403(inviter, target):
    with pytest.raises(HTTPException) as exc_info:
        _validate_invite_permission(_user(inviter), target)
    assert exc_info.value.status_code == 403
