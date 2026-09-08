"""
Polaris Backend — In-Memory TTL Cache Utility
Provides microsecond-latency caching for read-heavy database aggregation endpoints.
Includes instant cache invalidation on write/approval events.
"""
import time
from typing import Any, Dict, Optional, Tuple

class MemoryTTLCache:
    def __init__(self):
        # Maps key -> (data, expire_at_monotonic)
        self._cache: Dict[str, Tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            return None
        val, exp = self._cache[key]
        if time.monotonic() > exp:
            del self._cache[key]
            return None
        return val

    def set(self, key: str, value: Any, ttl: float = 15.0) -> None:
        self._cache[key] = (value, time.monotonic() + ttl)

    def invalidate(self, prefix: str = "") -> int:
        """Invalidate all keys matching prefix, or all if empty."""
        if not prefix:
            count = len(self._cache)
            self._cache.clear()
            return count
        keys_to_del = [k for k in self._cache if k.startswith(prefix)]
        for k in keys_to_del:
            del self._cache[k]
        return len(keys_to_del)

# Global singleton cache instance
cache = MemoryTTLCache()
