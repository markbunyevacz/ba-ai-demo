"""Session store placeholder implementation."""
from __future__ import annotations

from typing import Any, Dict


class SessionStore:
    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}

    def set(self, key: str, value: Dict[str, Any]) -> None:
        self._store[key] = value

    def get(self, key: str) -> Dict[str, Any] | None:
        return self._store.get(key)

    def delete(self, key: str) -> None:
        self._store.pop(key, None)
