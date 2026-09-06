"""
Polaris Backend — Rate Limiting Configuration
Uses slowapi (Starlette-compatible Limiter) backed by in-memory storage.
For production with multiple workers, swap to Redis: limits[redis].
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Key function: rate-limit per client IP address
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],  # global default
)
