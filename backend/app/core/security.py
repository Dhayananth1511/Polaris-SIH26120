"""
Polaris Backend — Password Hashing
Uses Argon2id via argon2-cffi. Never use MD5/SHA1/bcrypt for new code.
"""
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

# OWASP-recommended Argon2id parameters (2024)
_ph = PasswordHasher(
    time_cost=3,        # number of iterations
    memory_cost=65536,  # 64 MiB
    parallelism=4,
    hash_len=32,
    salt_len=16,
    encoding="utf-8",
)


def hash_password(plain: str) -> str:
    """Hash a plaintext password with Argon2id. Returns the encoded hash string."""
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify plaintext against Argon2id hash.
    Always returns False on any error — never leaks timing info.
    """
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(hashed: str) -> bool:
    """Return True if the stored hash uses outdated Argon2 parameters."""
    return _ph.check_needs_rehash(hashed)
