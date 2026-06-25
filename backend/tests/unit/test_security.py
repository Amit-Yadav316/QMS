"""Unit tests for app.core.security — password hashing and JWT tokens."""

from app.core.security import (
    create_access_token,
    create_invitation_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = hash_password("Password123!")
        assert hashed != "Password123!"
        assert hashed.startswith("$2")  # bcrypt prefix

    def test_verify_correct_password(self):
        hashed = hash_password("Password123!")
        assert verify_password("Password123!", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("Password123!")
        assert verify_password("wrong-password", hashed) is False

    def test_long_password_over_bcrypt_72_byte_limit(self):
        # SHA256 pre-hashing means passwords beyond bcrypt's 72-byte limit
        # are handled without truncation collisions.
        long_a = "a" * 100
        long_b = "a" * 99 + "b"
        hashed = hash_password(long_a)
        assert verify_password(long_a, hashed) is True
        assert verify_password(long_b, hashed) is False


class TestJWT:
    def test_access_token_roundtrip(self):
        token, jti = create_access_token(user_id=7, role="CLIENT_ADMIN", org_id=3)
        data = decode_token(token)
        assert data is not None
        assert data.user_id == 7
        assert data.role == "CLIENT_ADMIN"
        assert data.org_id == 3
        assert data.token_type == "access"
        assert data.jti == jti

    def test_refresh_token_type(self):
        token, _ = create_refresh_token(user_id=1, role="SUPERVISOR", org_id=1)
        data = decode_token(token)
        assert data is not None
        assert data.token_type == "refresh"

    def test_decode_garbage_returns_none(self):
        assert decode_token("not-a-real-jwt") is None

    def test_decode_empty_returns_none(self):
        assert decode_token("") is None

    def test_tokens_have_unique_jti(self):
        t1, jti1 = create_access_token(user_id=1, role="CLIENT_ADMIN", org_id=1)
        t2, jti2 = create_access_token(user_id=1, role="CLIENT_ADMIN", org_id=1)
        assert jti1 != jti2
        assert t1 != t2


class TestInvitationToken:
    def test_invitation_tokens_are_unique(self):
        tokens = {create_invitation_token() for _ in range(100)}
        assert len(tokens) == 100
